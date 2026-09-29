const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");

const app = express();

const PORT = 3000;

// DATOS INICIALES

const salasPermitidas = [
  "Sala Norte",
  "Sala Sur",
  "Sala Multimedia"
];

const turnosPermitidos = [
  "Mañana",
  "Tarde",
  "Noche"
];

let reservas = [
  {
    id: 1,
    estudiante: "Lucía Pérez",
    email: "lucia@gmail.com",
    sala: "Sala Norte",
    fecha: "2026-09-24",
    turno: "Mañana",
    personas: 2
  },
  {
    id: 2,
    estudiante: "Martín Gómez",
    email: "martin@gmail.com",
    sala: "Sala Sur",
    fecha: "2026-09-25",
    turno: "Tarde",
    personas: 4
  },
  {
    id: 3,
    estudiante: "Sofía López",
    email: "sofia@gmail.com",
    sala: "Sala Multimedia",
    fecha: "2026-09-26",
    turno: "Noche",
    personas: 3
  },
  {
    id: 4,
    estudiante: "Diego Fernández",
    email: "diego@gmail.com",
    sala: "Sala Norte",
    fecha: "2026-09-27",
    turno: "Tarde",
    personas: 5
  }
];

let proximoId = 5;

// MIDDLEWARE PERSONALIZADO 

let contadorSolicitudes = 0;

function identificarSolicitud(req, res, next) {
  contadorSolicitudes++;

  const numero = String(contadorSolicitudes).padStart(4, "0");

  res.locals.solicitudId = `BIB-${numero}`;

  next();
}

function medirDuracion(req, res, next) {
  const inicio = process.hrtime.bigint();

  res.on("finish", () => {
    const fin = process.hrtime.bigint();

    const duracionMs = Number(fin - inicio) / 1_000_000;

    console.log(
      `[${res.locals.solicitudId}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duracionMs.toFixed(2)} ms`
    );
  });

  next();
}

// CONFIGURACIÓN DE EJS Y ARCHIVOS ESTÁTICOS

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(expressLayouts);
app.set("layout", "layouts/main");

// MIDDLEWARES

// Middleware de terceros
app.use(morgan("dev"));

// Middleware personalizado
app.use(identificarSolicitud);

// Middleware personalizado
app.use(medirDuracion);

// Middleware incorporado
app.use(express.static(path.join(__dirname, "../public")));

// Parser para formularios
app.use(express.urlencoded({ extended: false }));

// Parser para JSON
app.use(express.json());

// RUTAS GENERALES

app.get("/", (req, res) => {
  res.render("inicio", {
    titulo: "Inicio"
  });
});

app.get("/estado", (req, res) => {
  res.json({
    servicio: "activo",
    reservas: reservas.length,
    solicitudId: res.locals.solicitudId
  });
});

// ROUTER DE RESERVAS

const reservasRouter = express.Router();

// Middleware de router

function prepararAreaReservas(req, res, next) {
  res.locals.seccion = "Reservas de salas";

  next();
}

reservasRouter.use(prepararAreaReservas);

// VALIDACIÓN DE RESERVA

function validarReserva(req, res, next) {
  const estudiante = String(req.body.estudiante || "").trim();
  const email = String(req.body.email || "").trim();
  const sala = String(req.body.sala || "").trim();
  const fecha = String(req.body.fecha || "").trim();
  const turno = String(req.body.turno || "").trim();

  const personasTexto = String(req.body.personas ?? "").trim();
  const personas = Number(personasTexto);

  const datosFormulario = {
    estudiante,
    email,
    sala,
    fecha,
    turno,
    personas: personasTexto
  };

  const errores = [];

  if (!estudiante) {
    errores.push("El estudiante es obligatorio.");
  }

  if (!email) {
    errores.push("El email es obligatorio.");
  } else if (!email.includes("@")) {
    errores.push("El email debe contener @.");
  }

  if (!sala) {
    errores.push("La sala es obligatoria.");
  } else if (!salasPermitidas.includes(sala)) {
    errores.push("La sala seleccionada no es válida.");
  }

  if (!fecha) {
    errores.push("La fecha es obligatoria.");
  }

  if (!turno) {
    errores.push("El turno es obligatorio.");
  } else if (!turnosPermitidos.includes(turno)) {
    errores.push("El turno seleccionado no es válido.");
  }

  if (!personasTexto) {
    errores.push("La cantidad de personas es obligatoria.");
  } else if (
    !Number.isInteger(personas) ||
    personas < 1 ||
    personas > 6
  ) {
    errores.push("La cantidad de personas debe ser un número entero entre 1 y 6.");
  }

  if (errores.length > 0) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva reserva",
      error: errores.join(" "),
      errores,
      datos: datosFormulario,
      salasPermitidas,
      turnosPermitidos
    });
  }

  req.reservaValidada = {
    estudiante,
    email,
    sala,
    fecha,
    turno,
    personas
  };

  next();
}

// HANDLER FINAL 

function crearReserva(req, res) {
  const nuevaReserva = {
    id: proximoId,
    ...req.reservaValidada
  };

  reservas.push(nuevaReserva);

  proximoId++;

  res.redirect("/reservas");
}

// RUTAS DEL ROUTER

reservasRouter.get("/nueva", (req, res) => {
  res.render("reservas/nueva", {
    titulo: "Nueva reserva",
    datos: {
      estudiante: "",
      email: "",
      sala: "",
      fecha: "",
      turno: "",
      personas: ""
    },
    salasPermitidas,
    turnosPermitidos
  });
});

reservasRouter.get("/", (req, res) => {
  res.render("reservas/lista", {
    titulo: "Reservas",
    reservas
  });
});

reservasRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  const reserva = reservas.find((item) => item.id === id);

  if (!reserva) {
    return res.status(404).render("no-encontrado", {
      titulo: "Reserva no encontrada",
      mensaje: "La reserva solicitada no existe."
    });
  }

  res.render("reservas/detalle", {
    titulo: "Detalle de reserva",
    reserva
  });
});

reservasRouter.post("/", validarReserva, crearReserva);

// Montaje del router
app.use("/reservas", reservasRouter);

app.use((req, res) => {
  res.status(404).render("no-encontrado", {
    titulo: "Página no encontrada",
    mensaje: "La dirección solicitada no existe."
  });
});

app.listen(PORT, () => {
  console.log(`Servidor disponible en http://localhost:${PORT}`);
});


