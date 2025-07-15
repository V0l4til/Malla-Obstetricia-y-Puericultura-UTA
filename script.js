// Versión Final: 2.0 - Con renderizado en dos pasadas
document.addEventListener('DOMContentLoaded', () => {
    const mallaContainer = document.getElementById('malla-container');
    const ESTADOS_STORAGE_KEY = 'malla_obstetricia_estados_grid_v2'; // Clave única para esta versión
    const estados = ['pendiente', 'aprobado', 'cursando', 'reprobado'];
    let cursosData = [];
    
    function cargarEstados() {
        const guardados = localStorage.getItem(ESTADOS_STORAGE_KEY);
        return guardados ? JSON.parse(guardados) : {};
    }

    function guardarEstados() {
        const estadosActuales = {};
        document.querySelectorAll('.curso').forEach(cursoDiv => {
            estadosActuales[cursoDiv.dataset.id] = cursoDiv.dataset.estado || 'pendiente';
        });
        localStorage.setItem(ESTADOS_STORAGE_KEY, JSON.stringify(estadosActuales));
    }

    function renderMalla(cursos, estadosGuardados) {
        mallaContainer.innerHTML = '';
        const maxSemestre = Math.max(...cursos.map(c => c.semestre));
        
        for (let i = 1; i <= maxSemestre; i++) {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'semestre-header';
            headerDiv.innerText = `Semestre ${i}`;
            headerDiv.style.gridColumn = i;
            mallaContainer.appendChild(headerDiv);
        }

        let proximaFila = Array(maxSemestre + 1).fill(2);

        const dibujarAsignatura = (curso) => {
            const duracion = curso.duracion || 1;
            let filaInicio = proximaFila[curso.semestre];

            if (duracion > 1) {
                for (let i = 1; i < duracion; i++) {
                    filaInicio = Math.max(filaInicio, proximaFila[curso.semestre + i]);
                }
            }
            
            const cursoDiv = document.createElement('div');
            cursoDiv.className = 'curso';
            const estadoActual = estadosGuardados[curso.id] || 'pendiente';
            cursoDiv.dataset.id = curso.id;
            cursoDiv.dataset.estado = estadoActual;

            if (estadoActual !== 'pendiente') {
                cursoDiv.classList.add(estadoActual);
            }

            cursoDiv.style.gridRow = filaInicio;
            cursoDiv.style.gridColumn = `${curso.semestre} / span ${duracion}`;

            cursoDiv.innerHTML = `<h3>${curso.nombre}</h3><p>Créditos: ${curso.creditos}</p>`;
            
            cursoDiv.addEventListener('click', () => {
                const estadoActual = cursoDiv.dataset.estado || 'pendiente';
                const indiceActual = estados.indexOf(estadoActual);
                const indiceNuevo = (indiceActual + 1) % estados.length;
                const estadoNuevo = estados[indiceNuevo];

                estados.forEach(e => cursoDiv.classList.remove(e));
                cursoDiv.dataset.estado = estadoNuevo;
                if (estadoNuevo !== 'pendiente') {
                    cursoDiv.classList.add(estadoNuevo);
                }
                
                updateHabilitados();
                guardarEstados();
            });

            cursoDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const prerequisitosNombres = cursosData.find(c => c.id === curso.id).prerequisitos.map(prereqId => {
                    const prereqCurso = cursosData.find(c => c.id === prereqId);
                    return prereqCurso ? prereqCurso.nombre : 'Desconocido';
                }).join('\n') || 'Ninguno';
                alert(`-- ${curso.nombre} --\n\nPrerrequisitos:\n${prerequisitosNombres}`);
            });

            mallaContainer.appendChild(cursoDiv);

            for (let i = 0; i < duracion; i++) {
                proximaFila[curso.semestre + i] = filaInicio + 1;
            }
        };

        // 1. PRIMERA PASADA: Dibuja solo las asignaturas anuales.
        cursos.filter(c => c.duracion && c.duracion > 1).forEach(dibujarAsignatura);

        // 2. SEGUNDA PASADA: Dibuja el resto de las asignaturas.
        cursos.filter(c => !c.duracion || c.duracion <= 1).forEach(dibujarAsignatura);
        
        updateHabilitados();
    }

    function updateHabilitados() {
        const aprobadosIds = new Set();
        document.querySelectorAll('.curso[data-estado="aprobado"]').forEach(cursoDiv => {
            aprobadosIds.add(cursoDiv.dataset.id);
        });

        cursosData.forEach(cursoInfo => {
            const cursoDiv = document.querySelector(`.curso[data-id='${cursoInfo.id}']`);
            if (!cursoDiv || cursoDiv.dataset.estado === 'aprobado') {
                if (cursoDiv) cursoDiv.classList.remove('habilitado');
                return;
            }
            const requisitosCumplidos = cursoInfo.prerequisitos.every(prereqId => aprobadosIds.has(prereqId));
            if (requisitosCumplidos) {
                cursoDiv.classList.add('habilitado');
            } else {
                cursoDiv.classList.remove('habilitado');
            }
        });
    }

    const estadosIniciales = cargarEstados();
    fetch('cursos.json')
        .then(response => response.json())
        .then(data => {
            cursosData = data;
            renderMalla(data, estadosIniciales);
        });
});
