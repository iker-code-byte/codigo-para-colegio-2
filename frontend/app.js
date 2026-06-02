const API_URL = window.location.protocol === 'file:' ? 'http://localhost:8000' : '';

// State
let currentUser = null;
let token = null;

// DOM Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const btnLogout = document.getElementById('btn-logout');
const toast = document.getElementById('toast');

// Views & Navigation
const navItems = document.querySelectorAll('.nav-item[data-target]');
const panels = document.querySelectorAll('.panel');
const currentViewTitle = document.getElementById('current-view-title');

// Init Date
document.getElementById('date-display').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ================= UTILS ==================
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.background = isError ? 'var(--danger-color)' : 'var(--secondary-color)';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function switchPanel(targetId) {
    panels.forEach(p => p.classList.add('hidden'));
    document.getElementById(targetId).classList.remove('hidden');
    
    navItems.forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if(activeNav) activeNav.classList.add('active');
    
    currentViewTitle.textContent = activeNav ? activeNav.textContent.trim() : 'Panel';
}

function checkAuth() {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if(savedUser && savedToken) {
        currentUser = JSON.parse(savedUser);
        token = savedToken;
        showDashboard();
    }
}

// ================= AUTH ==================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        });
        const data = await res.json();
        
        if(res.ok) {
            currentUser = data.user;
            token = data.token;
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('token', token);
            showDashboard();
            showToast('¡Bienvenido al sistema!');
        } else {
            showToast(data.detail || 'Error al iniciar sesión', true);
        }
    } catch(err) {
        console.error(err);
        showToast('Error de conexión con el servidor', true);
    }
});

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    currentUser = null;
    token = null;
    loginForm.reset();
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
    loginView.classList.add('flex-center');
});

function showDashboard() {
    loginView.classList.add('hidden');
    loginView.classList.remove('flex-center');
    dashboardView.classList.remove('hidden');
    
    // Update User Info
    document.getElementById('user-fullname').textContent = currentUser.nombre_completo;
    document.getElementById('user-role-badge').textContent = currentUser.rol.toUpperCase();
    document.getElementById('user-avatar').textContent = currentUser.nombre_completo.charAt(0);
    document.getElementById('welcome-message').textContent = `¡Hola, ${currentUser.nombre_completo}!`;
    
    // Role-based logic
    if(currentUser.rol === 'profesor') {
        document.getElementById('form-notas-container').style.display = 'block';
        document.getElementById('form-asistencia-container').style.display = 'block';
    } else {
        document.getElementById('form-notas-container').style.display = 'none';
        document.getElementById('form-asistencia-container').style.display = 'none';
    }
    
    // Load Courses/Students for dropdowns
    loadCursos();
    switchPanel('panel-inicio');
}

// ================= NAVIGATION ==================
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        if(target) switchPanel(target);
    });
});

// ================= DATA FETCHING ==================
async function loadCursos() {
    if(currentUser.rol === 'tutor') {
        document.getElementById('select-curso-notas').style.display = 'none';
        document.getElementById('select-curso-asistencia').style.display = 'none';
        loadEstudiantesTutor();
    } else {
        try {
            const res = await fetch(`${API_URL}/cursos`);
            const cursos = await res.json();
            
            const selectCursoNotas = document.getElementById('select-curso-notas');
            const selectCursoAsis = document.getElementById('select-curso-asistencia');
            
            let html = '<option value="">Seleccione un curso...</option>';
            cursos.forEach(c => {
                html += `<option value="${c.id}">${c.nombre}</option>`;
            });
            
            selectCursoNotas.innerHTML = html;
            selectCursoAsis.innerHTML = html;
            selectCursoNotas.style.display = 'inline-block';
            selectCursoAsis.style.display = 'inline-block';
            
            document.getElementById('select-estudiante-notas').disabled = true;
            document.getElementById('select-estudiante-asistencia').disabled = true;
        } catch(err) {
            console.error("Error cargando cursos", err);
        }
    }
}

async function loadEstudiantesTutor() {
    try {
        const res = await fetch(`${API_URL}/estudiantes/tutor/${currentUser.id}`);
        const estudiantes = await res.json();
        
        const selectNotas = document.getElementById('select-estudiante-notas');
        const selectAsis = document.getElementById('select-estudiante-asistencia');
        
        let html = '<option value="">Seleccione un estudiante...</option>';
        estudiantes.forEach(e => {
            html += `<option value="${e.id}">${e.nombre_completo} (${e.grado})</option>`;
        });
        
        selectNotas.innerHTML = html;
        selectAsis.innerHTML = html;
        selectNotas.disabled = false;
        selectAsis.disabled = false;
    } catch(err) {
        console.error("Error cargando estudiantes del tutor", err);
    }
}

async function loadEstudiantesCurso(curso_id, type) {
    try {
        const res = await fetch(`${API_URL}/estudiantes/curso/${curso_id}`);
        const estudiantes = await res.json();
        
        const selectEst = document.getElementById(`select-estudiante-${type}`);
        let html = '<option value="">Seleccione un estudiante...</option>';
        estudiantes.forEach(e => {
            html += `<option value="${e.id}">${e.nombre_completo} (${e.grado})</option>`;
        });
        
        selectEst.innerHTML = html;
        selectEst.disabled = false;
    } catch(err) {
        console.error("Error cargando estudiantes del curso", err);
    }
}

// Select Curso Events
document.getElementById('select-curso-notas').addEventListener('change', (e) => {
    const cursoId = e.target.value;
    const estSelect = document.getElementById('select-estudiante-notas');
    if(cursoId) {
        loadEstudiantesCurso(cursoId, 'notas');
    } else {
        estSelect.innerHTML = '<option value="">Seleccione un estudiante...</option>';
        estSelect.disabled = true;
    }
    document.querySelector('#tabla-notas tbody').innerHTML = '<tr><td colspan="4" class="text-center">Selecciona un estudiante para ver sus notas</td></tr>';
});

document.getElementById('select-curso-asistencia').addEventListener('change', (e) => {
    const cursoId = e.target.value;
    const estSelect = document.getElementById('select-estudiante-asistencia');
    if(cursoId) {
        loadEstudiantesCurso(cursoId, 'asistencia');
    } else {
        estSelect.innerHTML = '<option value="">Seleccione un estudiante...</option>';
        estSelect.disabled = true;
    }
    document.querySelector('#tabla-asistencia tbody').innerHTML = '<tr><td colspan="3" class="text-center">Selecciona un estudiante para ver el registro</td></tr>';
});

// Notas Fetch
document.getElementById('select-estudiante-notas').addEventListener('change', async (e) => {
    const estId = e.target.value;
    const tbody = document.querySelector('#tabla-notas tbody');
    if(!estId) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Selecciona un estudiante</td></tr>';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/notas/estudiante/${estId}`);
        const notas = await res.json();
        
        if(notas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay notas registradas</td></tr>';
            return;
        }
        
        let html = '';
        notas.forEach(n => {
            let statusClass = n.calificacion >= 51 ? 'status-success' : 'status-danger';
            let statusText = n.calificacion >= 51 ? 'Aprobado' : 'Reprobado';
            
            html += `<tr>
                <td>${n.materia}</td>
                <td>Trimestre ${n.trimestre}</td>
                <td><strong>${n.calificacion}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch(err) {
        showToast('Error cargando notas', true);
    }
});

// Registrar Nota
document.getElementById('form-registro-notas').addEventListener('submit', async(e) => {
    e.preventDefault();
    const estId = document.getElementById('select-estudiante-notas').value;
    if(!estId) return showToast('Por favor selecciona un estudiante arriba', true);
    
    const materia = document.getElementById('nota-materia').value;
    const trimestre = document.getElementById('nota-trimestre').value;
    const calificacion = document.getElementById('nota-calificacion').value;
    
    try {
        const res = await fetch(`${API_URL}/notas`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                estudiante_id: parseInt(estId),
                materia, trimestre: parseInt(trimestre),
                calificacion: parseFloat(calificacion),
                profesor_id: currentUser.id
            })
        });
        
        if(res.ok) {
            showToast('Nota registrada correctamente');
            document.getElementById('form-registro-notas').reset();
            // Trigger change to reload
            document.getElementById('select-estudiante-notas').dispatchEvent(new Event('change'));
        }
    } catch(err) {
        showToast('Error al guardar nota', true);
    }
});

// Asistencia Fetch
document.getElementById('select-estudiante-asistencia').addEventListener('change', async (e) => {
    const estId = e.target.value;
    const tbody = document.querySelector('#tabla-asistencia tbody');
    if(!estId) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Selecciona un estudiante</td></tr>';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/asistencia/estudiante/${estId}`);
        const asis = await res.json();
        
        if(asis.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No hay registros de asistencia</td></tr>';
            return;
        }
        
        let html = '';
        asis.forEach(a => {
            let status = 'Desconocido';
            let badge = '';
            if(a.estado === 'P') { status = 'Presente'; badge = 'status-success'; }
            if(a.estado === 'F') { status = 'Falta'; badge = 'status-danger'; }
            if(a.estado === 'A') { status = 'Atraso'; badge = 'status-warning'; }
            
            html += `<tr>
                <td>${a.fecha}</td>
                <td><span class="status-badge ${badge}">${status}</span></td>
                <td>${a.estado === 'F' ? '<i class="fas fa-exclamation-triangle text-danger"></i> Notificar a Tutor' : '-'}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch(err) {
        showToast('Error cargando asistencia', true);
    }
});

// Registrar Asistencia
document.getElementById('form-registro-asistencia').addEventListener('submit', async(e) => {
    e.preventDefault();
    const estId = document.getElementById('select-estudiante-asistencia').value;
    if(!estId) return showToast('Por favor selecciona un estudiante arriba', true);
    
    const fecha = document.getElementById('asistencia-fecha').value;
    const estado = document.getElementById('asistencia-estado').value;
    
    try {
        const res = await fetch(`${API_URL}/asistencia`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                estudiante_id: parseInt(estId),
                fecha, estado,
                profesor_id: currentUser.id
            })
        });
        
        if(res.ok) {
            showToast('Asistencia registrada correctamente');
            document.getElementById('form-registro-asistencia').reset();
            document.getElementById('select-estudiante-asistencia').dispatchEvent(new Event('change'));
        }
    } catch(err) {
        showToast('Error al guardar asistencia', true);
    }
});

// Auto Check on load
checkAuth();

// ================= MOBILE MENU LOGIC ==================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });
}

// Close sidebar on mobile when a nav item is clicked
navItems.forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('show');
        }
    });
});
