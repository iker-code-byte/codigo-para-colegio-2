import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sistema_escolar_v2.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Tabla de Usuarios
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol TEXT NOT NULL,  -- 'profesor' o 'tutor'
        nombre_completo TEXT NOT NULL,
        email TEXT
    )
    ''')

    # Tabla de Cursos
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cursos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL
    )
    ''')

    # Tabla de Estudiantes
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS estudiantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_completo TEXT NOT NULL,
        curso_id INTEGER,
        tutor_id INTEGER,
        FOREIGN KEY(curso_id) REFERENCES cursos(id),
        FOREIGN KEY(tutor_id) REFERENCES usuarios(id)
    )
    ''')
    
    # Tabla de Notas
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante_id INTEGER,
        materia TEXT NOT NULL,
        trimestre INTEGER NOT NULL,
        calificacion REAL NOT NULL,
        profesor_id INTEGER,
        FOREIGN KEY(estudiante_id) REFERENCES estudiantes(id),
        FOREIGN KEY(profesor_id) REFERENCES usuarios(id)
    )
    ''')

    # Tabla de Asistencia
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS asistencia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante_id INTEGER,
        fecha TEXT NOT NULL,
        estado TEXT NOT NULL, -- P(Presente), F(Falta), A(Atraso)
        profesor_id INTEGER,
        FOREIGN KEY(estudiante_id) REFERENCES estudiantes(id),
        FOREIGN KEY(profesor_id) REFERENCES usuarios(id)
    )
    ''')
    
    # Insertar usuarios de prueba si no existen
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    if cursor.fetchone()[0] == 0:
        # Usaremos contraseñas en texto plano para el MVP por facilidad visual, aunque en producción sería psswd hashing
        cursor.execute("INSERT INTO usuarios (username, password, rol, nombre_completo, email) VALUES ('profe1', 'mypass', 'profesor', 'Julieth Villaroel', 'profesor@colegio.edu')")
        cursor.execute("INSERT INTO usuarios (username, password, rol, nombre_completo, email) VALUES ('tutor1', '1234', 'tutor', 'Maria Gomez', 'tutor_prueba@gmail.com')")
        
        import random
        
        # Insertar Cursos
        cursos = ['1ro Secundaria', '2do Secundaria', '3ro Secundaria']
        for c in cursos:
            cursor.execute("INSERT INTO cursos (nombre) VALUES (?)", (c,))

        # Nombres y apellidos comunes para generar estudiantes aleatorios
        nombres = ["Ana", "Juan", "Maria", "Carlos", "Luis", "Elena", "Pedro", "Lucia", "Sofia", "Diego", "Jose", "Marta", "Laura", "Javier", "Carmen", "Antonio", "David", "Paula", "Miguel", "Isabel"]
        apellidos = ["Garcia", "Fernandez", "Gonzalez", "Rodriguez", "Lopez", "Martinez", "Sanchez", "Perez", "Gomez", "Martin", "Jimenez", "Ruiz", "Hernandez", "Diaz", "Moreno", "Alvarez", "Romero", "Alonso", "Gutierrez", "Navarro"]

        # Insertar 25 estudiantes por cada curso
        estudiante_id = 1
        for curso_id in range(1, 4): # ids de los 3 cursos
            for _ in range(25):
                nombre_random = f"{random.choice(nombres)} {random.choice(apellidos)} {random.choice(apellidos)}"
                # Asignaremos el tutor 2 (tutor1) al primer estudiante de prueba, a los demás NULL para simplificar, o todos a tutor 2
                cursor.execute("INSERT INTO estudiantes (nombre_completo, curso_id, tutor_id) VALUES (?, ?, ?)", (nombre_random, curso_id, 2))
                estudiante_id += 1
        
        # Notas (de prueba para el primer estudiante)
        cursor.execute("INSERT INTO notas (estudiante_id, materia, trimestre, calificacion, profesor_id) VALUES (1, 'Matematicas', 1, 85, 1)")
        
        # Asistencia (de prueba para el primer estudiante)
        cursor.execute("INSERT INTO asistencia (estudiante_id, fecha, estado, profesor_id) VALUES (1, '2026-04-15', 'P', 1)")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")
