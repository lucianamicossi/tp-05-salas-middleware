# Trabajo práctico 05

## Descripción

Esta aplicación es un sitio web para gestionar reservas de salas de estudio.

Está desarrollada con Node.js, Express y EJS. Las reservas se almacenan temporalmente en memoria, por lo que las nuevas reservas se mantienen mientras el servidor está funcionando y desaparecen cuando se reinicia la aplicación.

El trabajo tiene como objetivo practicar el uso de middleware en Express, diferenciando middleware de terceros, middleware incorporado y middleware personalizado.

También se utiliza un router de Express para agrupar las rutas relacionadas con las reservas.

## Instalación

Para instalar las dependencias del proyecto se debe ejecutar: npm install

## Ejecución

Para iniciar el servidor: npm start 

El servidor queda disponible en: http://localhost:3000

Para verificar la sintaxis del archivo principal: npm run check

El comando npm run check utiliza: node --check src/index.js

## Rutas

GET /  
Muestra la página principal de la aplicación.

Ejemplo: http://localhost:3000/

GET /estado  
Devuelve información del estado actual del servicio en formato JSON.

Ejemplo:

```json
{
  "servicio": "activo",
  "reservas": 4,
  "solicitudId": "BIB-0001"
}
```

El número de reservas aumenta cuando se crea una nueva reserva durante la ejecución del servidor.

El campo `solicitudId` corresponde al identificador generado por el middleware `identificarSolicitud`.

GET /reservas  
Muestra la lista de reservas existentes.

Ejemplo: http://localhost:3000/reservas

GET /reservas/nueva  
Muestra el formulario para crear una nueva reserva.

Esta ruta se declara antes de `/reservas/:id` para que `nueva` no sea interpretado como un identificador.

GET /reservas/:id  
Muestra el detalle de una reserva determinada.

Ejemplo: http://localhost:3000/reservas/1

Si el ID no corresponde a una reserva existente, se devuelve una página HTML con estado `404`.

POST /reservas  
Recibe los datos del formulario y crea una nueva reserva si la información es válida.

Cuando la reserva se crea correctamente, el servidor responde con `302 Found` y redirige a `/reservas`.

El navegador realiza luego un `GET /reservas` para mostrar la lista actualizada.

## Diagrama del POST

### POST válido

El recorrido de una solicitud `POST /reservas` con datos correctos es el siguiente:

POST /reservas
  ↓
morgan("dev")
  ↓
identificarSolicitud
  ↓
medirDuracion
  ↓
expressLayouts
  ↓
express.urlencoded
  ↓
reservasRouter
  ↓
prepararAreaReservas
  ↓
validarReserva
  ↓
crearReserva
  ↓
302 /reservas
  ↓
finish: ID + estado + duración

Cuando los datos enviados son correctos, `validarReserva` guarda los datos preparados en `req.reservaValidada` y utiliza `next()` para continuar hacia `crearReserva`.

`crearReserva` agrega la nueva reserva al arreglo en memoria y responde con una redirección `302` hacia `/reservas`.

Luego el navegador realiza un nuevo `GET /reservas` para mostrar la lista actualizada. Esta nueva solicitud tiene su propio recorrido de middleware y su propio evento `finish`.

El evento `finish` de la solicitud POST permite registrar en la terminal el identificador de la solicitud, el estado de la respuesta y la duración.

### POST inválido

Cuando los datos enviados no cumplen las condiciones de validación, el recorrido termina en `validarReserva`:

POST /reservas
  ↓
morgan("dev")
  ↓
identificarSolicitud
  ↓
medirDuracion
  ↓
expressLayouts
  ↓
express.urlencoded
  ↓
reservasRouter
  ↓
prepararAreaReservas
  ↓
validarReserva
  ↓
400 Bad Request
  ↓
render "reservas/nueva"

En este caso, `validarReserva` detecta los errores y responde directamente con estado `400`. Por eso no ejecuta `next()` y la solicitud no llega a `crearReserva`.

El formulario vuelve a mostrarse con los mensajes de error y conserva los valores ingresados para que puedan ser corregidos.

## Pipeline de middleware

El orden general de los middleware es:

Solicitud
   ↓
morgan("dev")
   ↓
identificarSolicitud
   ↓
medirDuracion
   ↓
expressLayouts
   ↓
express.static
   ↓
express.urlencoded
   ↓
express.json
   ↓
rutas de la aplicación
   ↓
reservasRouter
   ↓
404 final

Pipeline de un POST válido

POST /reservas
   ↓
morgan("dev")
   ↓
identificarSolicitud
   ↓
medirDuracion
   ↓
expressLayouts
   ↓
express.urlencoded
   ↓
reservasRouter
   ↓
prepararAreaReservas
   ↓
validarReserva
   ↓
crearReserva
   ↓
302 /reservas
   ↓
finish: ID + estado + duración

Pipeline de un POST inválido

POST /reservas
   ↓
morgan("dev")
   ↓
identificarSolicitud
   ↓
medirDuracion
   ↓
expressLayouts
   ↓
express.urlencoded
   ↓
reservasRouter
   ↓
prepararAreaReservas
   ↓
validarReserva
   ↓
400 + render de reservas/nueva
   ↓
finish: ID + estado + duración

Cuando los datos son inválidos, validarReserva termina la solicitud directamente con res.status(400).render(...).

## Alcance de cada función

### Middleware incorporado

La aplicación utiliza middleware incorporado de Express:

- `express.static()`: permite servir los archivos estáticos de la carpeta `public`.
- `express.urlencoded()`: permite recibir los datos enviados desde los formularios HTML.
- `express.json()`: permite interpretar solicitudes que contienen datos en formato JSON.

### Middleware de terceros

Se utiliza:

- `morgan("dev")`: registra en la terminal las solicitudes HTTP y sus códigos de estado.
- `express-ejs-layouts`: permite utilizar un layout general para las vistas EJS.

### Middleware personalizado

#### `identificarSolicitud`

Genera un identificador consecutivo para cada solicitud, por ejemplo:

BIB-0001
BIB-0002
BIB-0003

## Validación

La validación de las reservas se realiza en el servidor mediante el middleware `validarReserva`, que se ejecuta antes de `crearReserva`.

El POST está definido de la siguiente manera: reservasRouter.post("/", validarReserva, crearReserva);

Esto permite separar las responsabilidades: validarReserva se encarga de comprobar y preparar los datos, mientras que crearReserva solamente crea y guarda la reserva cuando los datos ya fueron validados.

Datos que se validan

Los campos que recibe el formulario son:

Estudiante: es obligatorio y se eliminan los espacios al principio y al final mediante trim().
Email: es obligatorio y debe contener @.
Sala: es obligatoria y debe ser una de las salas permitidas: Sala Norte, Sala Sur o Sala Multimedia.
Fecha: es obligatoria.
Turno: es obligatorio y debe ser Mañana, Tarde o Noche.
Cantidad de personas: es obligatoria y debe ser un número entero entre 1 y 6.

Si algún dato no cumple las condiciones, el servidor responde con estado 400, vuelve a mostrar el formulario y conserva los valores ingresados para que puedan ser corregidos.

Los errores se muestran mediante un elemento con role="alert".

Cuando todos los datos son correctos, se guardan en req.reservaValidada y se utiliza next() para continuar hacia crearReserva.

## Pruebas manuales

Se realizaron pruebas manuales de las principales rutas de la aplicación para comprobar el funcionamiento de los middleware, las vistas, la validación y las respuestas HTTP.

### Página de inicio

Se probó `GET /`.

Resultado: `200 OK`.

La página de inicio se muestra correctamente.

### Lista de reservas

Se probó `GET /reservas`.

Resultado: `200 OK`.

Se muestran correctamente las reservas iniciales cargadas en memoria.

### Formulario de nueva reserva

Se probó `GET /reservas/nueva`.

Resultado: `200 OK`.

El formulario se muestra correctamente con todos sus campos.

### Creación de una reserva válida

Se realizó un `POST /reservas` enviando todos los datos correctamente.

Resultado: `302 Found`.

La aplicación redirige a `/reservas` y la nueva reserva aparece correctamente en la lista.

En la terminal se observó el registro de Morgan y el middleware de duración:

`POST /reservas 302`

`[BIB-0010] POST /reservas 302 - 36.40 ms`

Luego se realizó:

`GET /reservas 200`

`[BIB-0011] GET /reservas 200 - 5.57 ms`

### Creación de una reserva inválida

Se realizó una prueba enviando datos incorrectos, por ejemplo un estudiante compuesto solamente por espacios.

El middleware `validarReserva` detectó el error mediante `trim()`.

Resultado: `400 Bad Request`.

En la terminal se observó:

`POST /reservas 400`

`[BIB-0015] POST /reservas 400 - 29.03 ms`

El formulario volvió a mostrarse con el mensaje de error y conservó los datos ingresados.

### Detalle de una reserva existente

Se probó `GET /reservas/1`.

Resultado: `200 OK`.

Se mostró correctamente el detalle de la reserva.

### Detalle de una reserva inexistente

Se probó `GET /reservas/99`.

Resultado: `404 Not Found`.

Se mostró correctamente la página de reserva no encontrada.

En la terminal se observó:

`GET /reservas/99 404`

`[BIB-0019] GET /reservas/99 404 - 10.67 ms`

### Ruta inexistente

Se probó `GET /esto-no-existe`.

Resultado: `404 Not Found`.

Se mostró correctamente la vista `no-encontrado.ejs`.

En la terminal se observó:

`GET /esto-no-existe 404`

`[BIB-0022] GET /esto-no-existe 404 - 6.25 ms`

Esto permitió comprobar el funcionamiento del middleware 404 ubicado al final del pipeline.

### Estado del servicio

Se probó `GET /estado`.

La respuesta devuelve información en formato JSON:

`servicio: activo`

`reservas: 4`

`solicitudId: BIB-0001`

La cantidad de reservas se actualiza durante la ejecución cuando se agregan nuevas reservas.

### Archivos estáticos

Se comprobó el acceso a la hoja de estilos mediante `GET /css/estilos.css`.

Resultado: `200 OK`.

Esto permitió verificar el funcionamiento de `express.static`.

### Persistencia temporal

Se creó una nueva reserva y se comprobó que la cantidad de reservas aumentara durante la ejecución.

Luego se detuvo y se volvió a iniciar el servidor.

Después del reinicio volvieron a aparecer solamente las cuatro reservas iniciales.

Esto permitió comprobar que las reservas nuevas se almacenan únicamente en memoria y se pierden al reiniciar el servidor.

### Códigos HTTP comprobados

Durante las pruebas se verificaron los siguientes códigos:

- `200`: solicitudes y páginas procesadas correctamente.
- `302`: redirección después de crear una reserva.
- `400`: datos inválidos enviados al formulario.
- `404`: rutas o reservas inexistentes.

Las pruebas también permitieron comprobar que Morgan registra las solicitudes y que `medirDuracion` muestra en la terminal el identificador, método, URL, estado y duración de cada solicitud.

## Persistencia temporal

Las reservas se almacenan temporalmente en memoria mediante un arreglo dentro de `src/index.js`.

La aplicación comienza con 4 reservas iniciales. Cuando se crea una nueva reserva mediante `POST /reservas`, esta se agrega al arreglo y queda disponible mientras el servidor permanezca en ejecución.

Al detener y volver a iniciar el servidor, las reservas nuevas se pierden y vuelven a mostrarse solamente las 4 reservas iniciales.

Esto fue comprobado durante las pruebas: se creó una quinta reserva, se detuvo el servidor y luego se volvió a iniciar. Después del reinicio, la quinta reserva ya no estaba disponible.

Por lo tanto, el proyecto no utiliza una base de datos ni archivos para persistir las nuevas reservas. La información agregada durante la ejecución es temporal y se pierde al reiniciar el servidor.

## Explicación de conceptos

### Diferencia entre middleware incorporado, de terceros y personalizado

Los middleware incorporados son funciones que Express ya proporciona y que se pueden utilizar directamente, por ejemplo `express.urlencoded()`, `express.json()` y `express.static()`. En este proyecto se utilizan para procesar los datos de los formularios, interpretar datos en formato JSON y servir archivos estáticos.

Los middleware de terceros son funciones desarrolladas por otras personas o equipos y que se instalan como dependencias del proyecto. En este caso se utiliza `morgan`, que permite registrar en la terminal las solicitudes recibidas y sus códigos de respuesta.

Los middleware personalizados son funciones creadas específicamente para este proyecto. Por ejemplo, `identificarSolicitud`, `medirDuracion` y `prepararAreaReservas`. Cada uno realiza una tarea propia dentro del funcionamiento de la aplicación.

### ¿Cuándo se utiliza next() ?

`next()` se utiliza cuando un middleware terminó su tarea y permite que la solicitud continúe hacia el siguiente middleware o controlador del pipeline.

Por ejemplo, `identificarSolicitud` genera el identificador de la solicitud y luego utiliza `next()` para continuar. Lo mismo ocurre con `medirDuracion` y `prepararAreaReservas`.

En cambio, cuando un middleware debe finalizar la respuesta, no se utiliza `next()`. Por ejemplo, si `validarReserva` encuentra datos incorrectos, responde con estado `400` y vuelve a mostrar el formulario.

### ¿Por qué los parsers aparecen antes de la validación?

Los parsers `express.urlencoded()` y `express.json()` aparecen antes de la validación porque son los encargados de interpretar los datos enviados en la solicitud.

En el caso del formulario de reservas, `express.urlencoded()` permite que los datos enviados mediante `POST` estén disponibles en `req.body`.

Por eso primero se procesan los datos recibidos y después `validarReserva` puede acceder a ellos, comprobarlos y decidir si la solicitud puede continuar.

### Diferencia entre alcance global, de router y de ruta

El alcance global significa que el middleware se ejecuta para las solicitudes que pasan por la aplicación después de su registro. En este proyecto, `identificarSolicitud` y `medirDuracion` tienen este alcance.

El alcance de router significa que el middleware se aplica solamente a las rutas pertenecientes a un router determinado. `prepararAreaReservas` se ejecuta dentro de `reservasRouter`, por lo que se utiliza para las rutas de reservas.

El alcance de ruta significa que el middleware se aplica únicamente a una ruta específica. En este proyecto, `validarReserva` se utiliza solamente en el `POST /reservas`, antes de `crearReserva`.

### Motivo de utilizar el evento finish

El evento `finish` de la respuesta se utiliza para saber cuándo la respuesta ya fue enviada y poder medir cuánto tardó en completarse la solicitud.

En `medirDuracion` se registra el momento inicial y, cuando ocurre `finish`, se calcula la diferencia de tiempo. De esta manera se puede mostrar en la terminal el identificador de la solicitud, el método, la URL, el código de estado y la duración.

### Resultado del montaje del router

El router se monta de la siguiente manera: app.use("/reservas", reservasRouter);

### Diferencia entre el POST 302 y el GET posterior

Cuando se envía correctamente el formulario mediante `POST /reservas`, la aplicación valida los datos, crea la nueva reserva y responde con un código `302`.

El código `302` indica al navegador que debe realizar una redirección hacia `/reservas`.

Luego el navegador realiza un nuevo `GET /reservas`, que muestra la lista actualizada incluyendo la nueva reserva.

Por lo tanto, son dos solicitudes diferentes:

- `POST /reservas`: recibe y procesa los datos del formulario y crea la reserva.
- `GET /reservas`: muestra la lista de reservas después de la redirección.

Esta separación permite que la creación de la reserva y la visualización de la lista sean responsabilidades diferentes.

### Motivo por el cual las altas desaparecen al reiniciar

Las nuevas reservas se almacenan solamente en un arreglo en memoria dentro de `src/index.js`.

Mientras el servidor está funcionando, las reservas agregadas permanecen disponibles porque están guardadas en ese arreglo.

Cuando se detiene el servidor, la memoria utilizada por la aplicación se libera y las reservas agregadas durante la ejecución se pierden.

Al volver a iniciar el servidor, el arreglo se crea nuevamente con las cuatro reservas iniciales definidas en el código.

Por este motivo, las altas realizadas durante la ejecución son temporales y desaparecen después de reiniciar la aplicación. El proyecto no utiliza una base de datos ni archivos para guardar las nuevas reservas de forma permanente.