(function () {
        "use strict";

        const STORAGE_KEY = "sca_reservas_v2";
        const DEFAULT_RESERVATIONS = [
            { id: 8821, espacio: "Aula B-201", fecha: "2026-01-25", horaInicio: "08:00", horaFin: "10:00" }
        ];

        const appState = {
            aulasServicio: 24,
            reservations: [],
            filterText: "",
            sectionActive: "dash",
            adminVisible: false,
            editingReservationId: null,
            nextId: 8822
        };

        const dashSection = document.getElementById("dash");
        const reservaForm = document.querySelector("#reserva form");
        const espacioField = document.getElementById("espacio");
        const fechaField = document.getElementById("fecha");
        const horaInicioField = document.getElementById("hora_inicio");
        const totalReservasEl = document.getElementById("totalReservas");
        const historialList = document.getElementById("reservasList");
        const sinReservasMsg = document.getElementById("sinReservasMsg");
        const filtroInput = document.getElementById("filtroHistorial");
        const ordenarFechaBtn = document.getElementById("ordenarFechaBtn");
        const adminSection = document.getElementById("admin");
        const navLinks = document.querySelectorAll("nav a");
        const detailsList = document.querySelectorAll("#aulas details");
        const headerTitle = document.querySelector("header h1");
        const dashParagraphs = dashSection.querySelectorAll("p");
        const disponibilidadText = dashParagraphs[1];
        const reservasActivasText = dashParagraphs[2];

        const estadoBox = document.createElement("div");
        estadoBox.className = "status-box hidden";
        reservaForm.appendChild(estadoBox);

        headerTitle.setAttribute("title", "Sistema institucional de reservas");
        adminSection.classList.add("hidden");

        function loadStorage() {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                appState.reservations = DEFAULT_RESERVATIONS.slice();
                return;
            }
            try {
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) {
                    appState.reservations = DEFAULT_RESERVATIONS.slice();
                    return;
                }
                appState.reservations = parsed;
                const maxId = appState.reservations.reduce(function (acc, item) {
                    return item.id > acc ? item.id : acc;
                }, 8821);
                appState.nextId = maxId + 1;
            } catch (error) {
                appState.reservations = DEFAULT_RESERVATIONS.slice();
            }
        }

        function saveStorage() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.reservations));
        }

        function toDisplayDate(yyyyMmDd) {
            const parts = yyyyMmDd.split("-");
            return parts[2] + "/" + parts[1] + "/" + parts[0];
        }

        function computeHoraFin(horaInicio) {
            const parts = horaInicio.split(":").map(Number);
            const date = new Date(2000, 0, 1, parts[0], parts[1], 0, 0);
            date.setHours(date.getHours() + 2);
            return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
        }

        function setStatus(message, type) {
            estadoBox.textContent = message;
            estadoBox.classList.remove("hidden", "ok", "warn");
            estadoBox.classList.add(type);
        }

        function clearStatus() {
            estadoBox.classList.add("hidden");
            estadoBox.textContent = "";
            estadoBox.classList.remove("ok", "warn");
        }

        function validateFields() {
            let valid = true;
            [fechaField, horaInicioField].forEach(function (field) {
                if (!field.value) {
                    field.classList.add("input-error");
                    valid = false;
                } else {
                    field.classList.remove("input-error");
                }
            });
            return valid;
        }

        function markActiveNav(hash) {
            const target = hash.replace("#", "") || "dash";
            appState.sectionActive = target;
            navLinks.forEach(function (link) {
                const isCurrent = link.getAttribute("href") === "#" + target;
                link.classList.toggle("nav-active", isCurrent);
            });
        }

        function renderDashboard() {
            const ocupadas = appState.reservations.length;
            const libres = Math.max(appState.aulasServicio - ocupadas, 0);
            disponibilidadText.innerHTML = "<strong>Disponibilidad inmediata:</strong> " + libres + " aulas libres";
            reservasActivasText.innerHTML = "<strong>Reservas activas:</strong> " + ocupadas + " aulas ocupadas";
            totalReservasEl.textContent = String(ocupadas);
        }

        function buildReservationItem(reserva) {
            const li = document.createElement("li");
            li.className = "reserva-item";
            li.dataset.id = String(reserva.id);
            li.innerHTML =
                "<div class=\"reserva-main\">" +
                "<strong>#"+ reserva.id + " - " + reserva.espacio + "</strong>" +
                "<span>Fecha: " + toDisplayDate(reserva.fecha) + "</span>" +
                "<span>Hora: " + reserva.horaInicio + " - " + reserva.horaFin + "</span>" +
                "</div>" +
                "<div class=\"reserva-actions\">" +
                "<button type=\"button\" class=\"reserva-btn editar\" data-action=\"edit\" data-id=\"" + reserva.id + "\">Editar</button>" +
                "<button type=\"button\" class=\"reserva-btn cancelar\" data-action=\"delete\" data-id=\"" + reserva.id + "\">Cancelar</button>" +
                "</div>";
            return li;
        }

        function filteredReservations() {
            const filtro = appState.filterText.trim().toLowerCase();
            if (!filtro) {
                return appState.reservations;
            }
            return appState.reservations.filter(function (reserva) {
                const text = (reserva.espacio + " " + reserva.fecha + " " + reserva.horaInicio).toLowerCase();
                return text.includes(filtro);
            });
        }

        function renderReservations() {
            historialList.innerHTML = "";
            const items = filteredReservations();

            if (appState.reservations.length === 0) {
                sinReservasMsg.classList.remove("hidden");
                return;
            }
            sinReservasMsg.classList.add("hidden");

            if (items.length === 0) {
                const li = document.createElement("li");
                li.className = "empty-message";
                li.textContent = "No hay resultados para el filtro actual.";
                historialList.appendChild(li);
                return;
            }

            items.forEach(function (reserva) {
                historialList.appendChild(buildReservationItem(reserva));
            });
        }

        function renderAll() {
            renderDashboard();
            renderReservations();
        }

        function existsDuplicate(espacio, fecha, horaInicio) {
            return appState.reservations.some(function (reserva) {
                return reserva.espacio === espacio && reserva.fecha === fecha && reserva.horaInicio === horaInicio;
            });
        }

        function startEditReservation(id) {
            const found = appState.reservations.find(function (reserva) {
                return reserva.id === id;
            });
            if (!found) {
                return;
            }

            espacioField.value = found.espacio;
            fechaField.value = found.fecha;
            horaInicioField.value = found.horaInicio;
            appState.editingReservationId = found.id;
            appState.reservations = appState.reservations.filter(function (reserva) {
                return reserva.id !== id;
            });
            saveStorage();
            renderAll();
            setStatus("Editando reserva #" + id + ". Realiza cambios y presiona Registrar Reserva.", "ok");
            document.getElementById("reserva").scrollIntoView({ behavior: "smooth", block: "start" });
        }

        function deleteReservation(id) {
            appState.reservations = appState.reservations.filter(function (reserva) {
                return reserva.id !== id;
            });
            saveStorage();
            renderAll();
            setStatus("Reserva #" + id + " cancelada.", "warn");
        }

        navLinks.forEach(function (link) {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                const targetId = link.getAttribute("href");
                const section = document.querySelector(targetId);
                if (!section) {
                    return;
                }
                if (targetId === "#admin") {
                    appState.adminVisible = true;
                    adminSection.classList.remove("hidden");
                }
                markActiveNav(targetId);
                section.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });

        detailsList.forEach(function (item) {
            item.addEventListener("toggle", function () {
                item.classList.toggle("opened", item.open);
                if (!item.open) {
                    return;
                }
                detailsList.forEach(function (other) {
                    if (other !== item) {
                        other.open = false;
                        other.classList.remove("opened");
                    }
                });
            });
        });

        filtroInput.addEventListener("input", function () {
            appState.filterText = filtroInput.value;
            renderReservations();
        });

        ordenarFechaBtn.addEventListener("click", function () {
            appState.reservations.sort(function (a, b) {
                const dateA = new Date(a.fecha + "T" + a.horaInicio + ":00");
                const dateB = new Date(b.fecha + "T" + b.horaInicio + ":00");
                return dateA - dateB;
            });
            saveStorage();
            renderReservations();
        });

        historialList.addEventListener("click", function (event) {
            const button = event.target.closest("button[data-action]");
            if (!button) {
                return;
            }
            const id = Number(button.dataset.id);
            const action = button.dataset.action;
            if (action === "delete") {
                deleteReservation(id);
                return;
            }
            if (action === "edit") {
                startEditReservation(id);
            }
        });

        [fechaField, horaInicioField].forEach(function (field) {
            field.addEventListener("input", function () {
                field.classList.remove("input-error");
                clearStatus();
            });
        });

        reservaForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!validateFields()) {
                setStatus("Completa fecha y hora para registrar la reserva.", "warn");
                return;
            }

            const espacio = espacioField.value;
            const fecha = fechaField.value;
            const horaInicio = horaInicioField.value;
            const horaFin = computeHoraFin(horaInicio);

            if (existsDuplicate(espacio, fecha, horaInicio)) {
                alert("Conflicto: ya existe una reserva para esa aula, fecha y hora.");
                setStatus("Conflicto detectado. Revisa los datos de reserva.", "warn");
                return;
            }

            const id = appState.editingReservationId === null ? appState.nextId++ : appState.editingReservationId;
            appState.editingReservationId = null;

            appState.reservations.push({
                id: id,
                espacio: espacio,
                fecha: fecha,
                horaInicio: horaInicio,
                horaFin: horaFin
            });

            saveStorage();
            renderAll();
            setStatus("Reserva guardada con exito. ID #" + id, "ok");
            reservaForm.reset();
        });

        loadStorage();
        markActiveNav("#dash");
        renderAll();
    }());
