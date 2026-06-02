from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database
import email_service

app = FastAPI(title="Sistema Web Escolar - API Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    database.init_db()

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/auth/login")
def login(req: LoginRequest):
    # Forzamos la inicializacion de la base de datos para evitar errores si el server no se reinicio
    database.init_db()
    
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, rol, nombre_completo FROM usuarios WHERE username=? AND password=?", (req.username, req.password))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {"success": True, "token": f"fake-jwt-token-{user['id']}", "user": dict(user)}
    else:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

# --- MODULO NOTAS ---
class NotaRequest(BaseModel):
    estudiante_id: int
    materia: str
    trimestre: int
    calificacion: float
    profesor_id: int

@app.get("/notas/estudiante/{estudiante_id}")
def get_notas(estudiante_id: int):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notas WHERE estudiante_id=?", (estudiante_id,))
    notas = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return notas

@app.post("/notas")
def crear_nota(req: NotaRequest):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO notas (estudiante_id, materia, trimestre, calificacion, profesor_id) VALUES (?, ?, ?, ?, ?)",
        (req.estudiante_id, req.materia, req.trimestre, req.calificacion, req.profesor_id)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Nota registrada exitosamente"}

# --- MODULO ASISTENCIA ---
class AsistenciaRequest(BaseModel):
    estudiante_id: int
    fecha: str
    estado: str
    profesor_id: int

@app.get("/asistencia/estudiante/{estudiante_id}")
def get_asistencia(estudiante_id: int):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM asistencia WHERE estudiante_id=?", (estudiante_id,))
    asistencias = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return asistencias

@app.post("/asistencia")
def crear_asistencia(req: AsistenciaRequest):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO asistencia (estudiante_id, fecha, estado, profesor_id) VALUES (?, ?, ?, ?)",
        (req.estudiante_id, req.fecha, req.estado, req.profesor_id)
    )
    
    # Si es falta, enviar notificación al correo del tutor
    if req.estado == 'F':
        cursor.execute('''
            SELECT e.nombre_completo as estudiante_nombre, u.email as tutor_email
            FROM estudiantes e
            JOIN usuarios u ON e.tutor_id = u.id
            WHERE e.id = ?
        ''', (req.estudiante_id,))
        info = cursor.fetchone()
        if info and info['tutor_email']:
            email_service.enviar_notificacion_falta(
                info['tutor_email'], info['estudiante_nombre'], req.fecha
            )

    conn.commit()
    conn.close()
    return {"success": True, "message": "Asistencia registrada"}

# --- MODULO ESTUDIANTES ---
@app.get("/estudiantes/tutor/{tutor_id}")
def get_estudiantes_tutor(tutor_id: int):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.*, c.nombre as grado 
        FROM estudiantes e 
        JOIN cursos c ON e.curso_id = c.id 
        WHERE e.tutor_id=?
    ''', (tutor_id,))
    estudiantes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return estudiantes

@app.get("/estudiantes/curso/{curso_id}")
def get_estudiantes_curso(curso_id: int):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.*, c.nombre as grado 
        FROM estudiantes e 
        JOIN cursos c ON e.curso_id = c.id 
        WHERE e.curso_id=?
    ''', (curso_id,))
    estudiantes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return estudiantes

@app.get("/cursos")
def get_cursos():
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cursos")
    cursos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return cursos

@app.get("/estudiantes")
def get_all_estudiantes():
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM estudiantes")
    estudiantes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return estudiantes

import os
from fastapi.staticfiles import StaticFiles

# Servir archivos estáticos del frontend en la raíz
frontend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
