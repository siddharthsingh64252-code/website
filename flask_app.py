from flask import Flask, send_from_directory, request, jsonify
import sqlite3
import os

app = Flask(__name__, static_folder='.')

def get_db():
    conn = sqlite3.connect('inkwell.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        title TEXT,
        content TEXT,
        date TEXT
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT,
        password TEXT,
        bio TEXT,
        joined TEXT
    )''')
    conn.commit()
    conn.close()

# serve frontend
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(path):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')

# API routes
@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    conn = get_db()
    conn.execute('INSERT INTO users (username, email, password, bio, joined) VALUES (?,?,?,?,?)',
        (data['username'], data['email'], data['password'], '', data['joined']))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email=? AND password=?',
        (data['email'], data['password'])).fetchone()
    conn.close()
    if user:
        return jsonify({'ok': True, 'user': dict(user)})
    return jsonify({'ok': False}), 401

@app.route('/api/posts', methods=['GET'])
def get_posts():
    conn = get_db()
    posts = conn.execute('SELECT * FROM posts ORDER BY id DESC').fetchall()
    conn.close()
    return jsonify([dict(p) for p in posts])

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    conn = get_db()
    conn.execute('INSERT INTO posts (username, title, content, date) VALUES (?,?,?,?)',
        (data['username'], data['title'], data['content'], data['date']))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/api/bio', methods=['POST'])
def update_bio():
    data = request.json
    conn = get_db()
    conn.execute('UPDATE users SET bio=? WHERE id=?', (data['bio'], data['id']))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)