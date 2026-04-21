import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, send_from_directory, request, jsonify
from datetime import datetime

app = Flask(__name__, static_folder='.')

# -------------------------------------------------------
# DATABASE CONNECTION
# Railway provides DATABASE_URL environment variable
# -------------------------------------------------------
def get_db():
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'), cursor_factory=RealDictCursor)
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            bio TEXT DEFAULT '',
            joined TEXT NOT NULL
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            username TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            date TEXT NOT NULL
        )
    ''')
    conn.commit()
    cur.close()
    conn.close()

# -------------------------------------------------------
# SERVE FRONTEND
# -------------------------------------------------------
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(path):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')

# -------------------------------------------------------
# API — USERS
# -------------------------------------------------------
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO users (username, email, password, bio, joined) VALUES (%s, %s, %s, %s, %s) RETURNING id',
            (data['username'], data['email'], data['password'], '', data['joined'])
        )
        user_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'ok': True, 'id': user_id})
    except psycopg2.errors.UniqueViolation:
        return jsonify({'ok': False, 'error': 'Username or email already taken.'}), 400
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'SELECT * FROM users WHERE email=%s AND password=%s',
            (data['email'], data['password'])
        )
        user = cur.fetchone()
        cur.close()
        conn.close()
        if user:
            return jsonify({'ok': True, 'user': dict(user)})
        return jsonify({'ok': False, 'error': 'Invalid email or password.'}), 401
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/bio', methods=['POST'])
def update_bio():
    data = request.json
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('UPDATE users SET bio=%s WHERE id=%s', (data['bio'], data['id']))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

# -------------------------------------------------------
# API — POSTS
# -------------------------------------------------------
@app.route('/api/posts', methods=['GET'])
def get_posts():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM posts ORDER BY id DESC')
        posts = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([dict(p) for p in posts])
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO posts (user_id, username, title, content, date) VALUES (%s, %s, %s, %s, %s)',
            (data['user_id'], data['username'], data['title'], data['content'], data['date'])
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/posts/user/<int:user_id>', methods=['GET'])
def get_user_posts(user_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM posts WHERE user_id=%s ORDER BY id DESC', (user_id,))
        posts = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([dict(p) for p in posts])
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

# -------------------------------------------------------
# START
# -------------------------------------------------------
if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)