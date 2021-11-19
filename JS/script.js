const auth = firebase.auth();
var miPersonaje = false;
var adivinar = false;
var modo = true;

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        $("#botones").append("<button class='btn btn-outline-danger' id='btnCerrarSession'>Cerrar sesion</button>");
        $("#nombreUsuario").text("Bienvenido " + user.displayName);
        cerrarSesion();
        agregarJugador(user);
        $("#modosin").click(() => {
            modo = false;

            $("#divRespuesta").addClass("ocultar");
            $("#divPregunta").addClass("ocultar");
        })
        $("#modocon").click(() => {
            modo = true;
            firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"))
                .get().then((result) => {
                    if (result.data().turno == localStorage.getItem("numJugador")) {
                        $("#divPregunta").removeClass("ocultar");

                    }
                    else {
                        if (result.data().respuesta != undefined) {
                            $("#divRespuesta").removeClass("ocultar");
                        }
                    }
                })
        })
        cargarArchivos();
        // EVENTO DE BUSCAR JUGADOR
        $("#buscar").click((e) => {
            e.preventDefault();

            // COMPROBACION DE LA LONGITUDA DEL VALUE DEL INPUT
            var nombre = $("#inpUsuario").val();
            nombre = nombre.trim();
            if (user.displayName != nombre && nombre.length > 0) {
                buscarUsuario(user, nombre);
            }
        })

        // EVENTO DE SALIR DE PARTIDA
        $("#salir").click(() => {
            resetVariables();
        })

    } else {
        // NO HAY USUARIO
        $("#formulario").addClass("ocultar");
        $("#secJuego").children("*").addBack().addClass("ocultar");
        $("#imagenes").empty();
        $("#botones").append("<button class='btn btn-outline-success' id='btnAcceder'>Acceder</button >");
        $("#nombreUsuario").text("Inicie Sesion")
        iniciarSesion();
    }
});

const iniciarSesion = () => {
    $("#btnAcceder").click(async () => {
        try {
            var provider = new firebase.auth.GoogleAuthProvider();
            await firebase.auth().signInWithPopup(provider);
            $("#btnAcceder").remove();
            $(this).remove();
        } catch (error) {
            console.error(error);
        }
    });

    $("#formulario").addClass("ocultar");

};

const cerrarSesion = () => {
    $("#btnCerrarSession").click(() => {
        $(this).remove();
        firebase.auth().signOut();
        $("#btnCerrarSession").remove();
        resetVariables();

    });
    $("#formulario").removeClass("ocultar");

}

// AGREGA EL JUGADOR A LA SALA TRAS RECIBIR LA INVITACION Y ACEPTAR, SI RECHAZA ELIMINA LA SALA
const agregarJugador = (user) => {
    var coleccion = firebase.firestore().collection("jugadores");

    coleccion.doc(user.displayName).set({
        id: user.uid
    })

    coleccion.doc(user.displayName).onSnapshot((result) => {
        if (result.data().solicitud != undefined && !localStorage.getItem("numSala")) {

            /*************************************** MOSTRAMOS LA SOLICITUD *************************************************************/
            // BUSCAMOS EL NOMBRE DEL USUARIO
            coleccion.where("id", "==", result.data().solicitud.split("###")[0]).get()
                .then((nombreSolicitud) => {
                    nombreSolicitud.forEach(element => {
                        $("#titInv").text("Invitacion de " + element.id)
                    });

                    $("#solicitud").removeClass("ocultar");
                    var sala = result.data().solicitud.split("###")[1];
                    var colecSalas = firebase.firestore().collection("salas");

                    // BOTON ACEPTAR
                    $("#solAcep").click(() => {
                        $("#solicitud").addClass("ocultar");
                        colecSalas.doc("sala-" + sala).get()
                            .then((array) => {
                                // AGREGAMOS EL NUEVO USUARIO AL ARRAY Y LUEGO A LA BASE DE DATOS
                                var arrayJugadores = [];

                                if (array.exists && array.data().jugadores) {
                                    arrayJugadores = array.data().jugadores;
                                }
                                arrayJugadores.push(user.displayName);
                                localStorage.setItem("numSala", sala);
                                localStorage.setItem("numJugador", 1);
                                colecSalas.doc("sala-" + sala).update({
                                    jugadores: arrayJugadores
                                })
                                console.log("aceptado y creado");

                                cargarArchivos();
                            })

                    })

                    // BOTON DENEGAR
                    $("#solDen").click(() => {
                        $("#solicitud").addClass("ocultar");
                        colecSalas.doc("sala-" + sala).delete();
                        colecSalas.doc("jugadas-" + sala).delete();

                    })
                })

        }
    })
}

const buscarUsuario = (user, nombre) => {
    resetVariables();

    var coleccion = firebase.firestore().collection("jugadores");
    coleccion.doc(nombre).get()
        .then((result) => {

            if (result.exists) {
                $("#inpUsuario").val("");

                var numSala = parseInt(Math.random() * (100000 - 0) + 0)
                coleccion.doc(nombre).update({
                    solicitud: user.uid + "###" + numSala
                })
                firebase.firestore().collection("salas").doc("sala-" + numSala).set({
                    jugadores: [user.displayName],
                })

                firebase.firestore().collection("salas").doc("jugadas-" + numSala).set({
                    miPersonaje: ["", ""],
                    quitadosPers: ["", ""],
                    turno: 0
                })

                localStorage.setItem("numSala", numSala);
                localStorage.setItem("numJugador", 0);
                console.log("buscado y creado");
                cargarArchivos();
            }
        })
}

/*



***************************************************************  SCRIPT DE PARTIDA **********************************************



*/

const cargarArchivos = () => {
    firebase.firestore().collection("salas").doc("sala-" + localStorage.getItem("numSala")).onSnapshot((result) => {
        var cond = false;
        if (result.exists && result.data().jugadores.length > 1) {
            cond = true;
        }

        // SI HAY UNA PARTIDA ACTIVA
        if (cond) {
            $("#textCambio").text("");
            $("#formulario").addClass("ocultar");
            $("#secJuego").find("*").addBack().removeClass("ocultar");
            $("#divPregunta").addClass("ocultar");
            $("#divRespuesta").addClass("ocultar");
            $("#adivinar").addClass("ocultar");

            // CARGA LAS IMAGENES EN LA PANTALLA
            firebase.storage().ref().child("").listAll()
                .then(async (result) => {
                    $("#imagenes").empty();
                    var conexion = firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"))
                        .get();

                    result.items.forEach(element => {
                        firebase.storage().ref(element.name).getDownloadURL()
                            .then(async (res) => {
                                var img = $("<button class='imgJuego'> </button>");
                                $(img).attr("id", element.name.split(".png")[0])
                                $(img).click(marcarImagen)
                                $(img).attr("style", "background-image: url('" + res + "')");
                                $("#imagenes").append(img);

                                await marcarRojo(conexion);
                            })


                    });


                })

            if (localStorage.getItem("url")) {
                $("#mipersonaje").css("background-image", localStorage.getItem("url"));
            }

            // EVENTO  QUE ESCUCHA SI SE HA CAMBIADO EL TURNO DEL JUGADOR

            var jugada = firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"));

            jugada.onSnapshot((result) => {
                if (result.exists) {
                    // COMPROBAMOS QUE LOS PERSONAJES ESTEN ESTABLECIDOS
                    if (!result.data().miPersonaje.includes("")) {
                        $("#turno").removeClass("ocultar");

                        // SI NADIE HA GANADO
                        if (result.data().victoria == undefined) {

                            // SI ES MI TURNO 
                            if (result.data().turno == localStorage.getItem("numJugador")) {
                                $("#turno").text("ES TU TURNO");
                                $("#aceptar").removeClass("ocultar")
                                $("#adivinar").removeClass("ocultar")

                                $("#divRespuesta").addClass("ocultar");


                                if (result.data().respuesta != undefined) {
                                    $("#textCambio").text("Respuesta: " + result.data().respuesta);
                                }
                            }
                            // SI NO ES MI TURNO 
                            else {
                                $("#turno").text("ES EL TURNO DEL RIVAL");
                                $("#aceptar").addClass("ocultar")
                                $("#adivinar").addClass("ocultar")
                                $("#divPregunta").addClass("ocultar");

                                if (result.data().pregunta != undefined && result.data().pregunta.length > 0) {
                                    $("#divRespuesta").removeClass("ocultar");
                                    $("#textCambio").text(result.data().pregunta);
                                }
                            }
                        }
                        // EN EL CASO DE QUE ALGUIEN HAYA GANADO SE MUESTRA EL GANADOR Y SE TERMINA
                        else {
                            $("#secJuego").addClass("ocultar")

                            $("#victoria").removeClass("ocultar");
                            firebase.firestore().collection("salas").doc("sala-" + localStorage.getItem("numSala"))
                                .get().then((nombre) => {
                                    $("#titFin").text("LA VICTORIA ES PARA " + nombre.data().jugadores[result.data().victoria]);

                                })

                            var url = $("#" + result.data().miPersonaje[localStorage.getItem("numJugador")]).css("background-image")
                            $("#imgFin").css("background-image", url);
                            setTimeout(() => {
                                $("#victoria").addClass("ocultar");
                                resetVariables();
                            }, 5000);
                        }

                    }
                    else {
                        $("#turno").text("RONDA DE ELECCION DE PERSONAJE");

                    }

                }
            })

            // EVENTO DEL BOTON DE ACEPTAR
            $("#aceptar").click((e) => {
                e.preventDefault();

                var jugada = firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"))
                $("#textCambio").text("");

                jugada.update({
                    respuesta: firebase.firestore.FieldValue.delete(),
                    pregunta: firebase.firestore.FieldValue.delete()
                })

                jugada.get().then((result) => {
                    if (!adivinar) {

                        // CONDICION DE ESTABLECER LOS PERSONAJES
                        if ($(".seleccionado").length > 0 && result.data().miPersonaje.includes("")) {
                            var array = result.data().miPersonaje;
                            array[localStorage.getItem("numJugador")] = $(".seleccionado").attr("id");
                            jugada.update({
                                miPersonaje: array
                            })

                            localStorage.setItem("url", $(".seleccionado").css("background-image"))

                            $(".seleccionado").removeClass("seleccionado");
                        }

                        // CONDICION DE DESCARTAR LOS PERSONAJES
                        else if (!result.data().miPersonaje.includes("")) {
                            if (result.data().turno == localStorage.getItem("numJugador")) {
                                var quitados = document.getElementsByClassName("quitado")
                                var array = "";
                                var quitadosPers = result.data().quitadosPers;
                                for (let i = 0; i < quitados.length; i++) {
                                    array += quitados[i].id + "-";
                                }

                                quitadosPers[localStorage.getItem("numJugador")] = array;
                                var turno = result.data().turno;
                                if (turno == 0) {
                                    turno = 1
                                }
                                else {
                                    turno = 0;
                                }

                                jugada.update({
                                    quitadosPers: quitadosPers,
                                    turno: turno
                                })
                            }
                            else {
                                console.log("No es tu turno");

                            }
                        }
                    }
                    else {
                        comprobarAdivinado(jugada);
                    }


                })

            })

            $("#adivinar").click((e) => {
                e.preventDefault();
                firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"))
                    .get().then((result) => {
                        if (!result.data().miPersonaje.includes("")) {
                            if (adivinar) {
                                $(".adivinado").removeClass("adivinado");
                                $("#adivinar").removeClass("clikado");
                                adivinar = false;
                            }
                            else {
                                $("#adivinar").addClass("clikado");
                                adivinar = true;
                            }
                        }
                    })

            })

            // BOTON DE ENVIAR PREGUNTA
            $("#envPreg").click((e) => {

                console.log("a ver-- " + ($("#pregunta").val().length > 0));

                if ($("#pregunta").val().length > 0) {
                    $("#textCambio").text("Espera la respuesta del jugador...");
                    $("#divPregunta").addClass("ocultar");

                    console.log("a ver");

                    var jugada = firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"))
                    jugada.update({
                        pregunta: $("#pregunta").val()
                    })

                }
                else {
                    $("#pregunta").trigger("click");
                }
                e.preventDefault();

                return false;
            })

            // BOTON DE ENVIAR RESPUESTA
            $("#envResp").click((e) => {
                console.log("vaaaal.... " + $("#respuesta").val());
                $("#textCambio").text("Espera al jugador...");
                $("#divRespuesta").addClass("ocultar");
                console.log("respondí");
                var jugada = firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"))
                jugada.update({
                    respuesta: $("#respuesta").val()
                })

                e.preventDefault();

            })
        }
        // SI NO HAY UNA PARTIDA ACTIVA
        else {
            $("#formulario").removeClass("ocultar");
            $("#secJuego").find("*").addBack().addClass("ocultar");
            $("#imagenes").empty();
        }

        if (!result.exists) {
            resetVariables();
        }
    })

}

// MARCA EN ROJO LOS PERSONAJES REMARCADOS
function marcarRojo(conexion) {
    conexion.then((result) => {
        if (result.exists) {
            var array = result.data().quitadosPers[localStorage.getItem("numJugador")];
            if (array.length > 0) {
                array = array.split("-");

                for (let i = 0; i < array.length; i++) {
                    if (array[i].length > 1) {
                        $("#" + array[i]).addClass("quitado");
                    }
                }
            }
        }
    })
}


const comprobarAdivinado = (jugada) => {
    jugada.get().then((result) => {
        var vict = 0;
        if (localStorage.getItem("numJugador") == 1) {
            if ($(".adivinado").attr("id") == result.data().miPersonaje[0]) {
                vict = 1;
            }
            else {
                vict = 0;
            }
        }
        else {
            if ($(".adivinado").attr("id") == result.data().miPersonaje[1]) {
                vict = 0;
            }
            else {
                vict = 1;
            }
        }
        jugada.update({
            victoria: vict
        })
    })
}


function marcarImagen() {
    var jugadas = firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"));

    jugadas.get()
        .then((result) => {
            if (!adivinar) {

                var cond = true;

                // COMPORBACION SI AMBOS JUGADORES HAN MARCADO SU PERSONAJE
                if (result.data().miPersonaje.includes("")) {
                    cond = false;
                }

                // SI AMBOS ESTAN MARCADOS Y NO SE HA SELECCIONADO EL PERSONAJE 
                if (!cond) {
                    if (result.data().miPersonaje[localStorage.getItem("numJugador")] == "") {

                        var array = result.data().miPersonaje;

                        $(".seleccionado").removeClass("seleccionado");
                        $(this).addClass("seleccionado");

                        // SACAMOS LA URL PARA PONERLA EN EL ESPACIO DE MIPERSONAJE
                        $("#mipersonaje").css("background-image", $(this).css("background-image"));
                        array[localStorage.getItem("numJugador")] = $(this).attr("id");
                    }

                }
                else {
                    $(this).toggleClass("quitado");
                }
            }
            else {
                $(".adivinado").removeClass("adivinado");
                $(this).addClass("adivinado");
            }

        })

}




function resetVariables() {
    if (localStorage.getItem("numSala")) {
        firebase.firestore().collection("salas").doc("sala-" + localStorage.getItem("numSala")).delete();
        firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala")).delete();
    }
    miPersonaje = false;
    $("#mipersonaje").removeAttr("src");
    $("textCambio").text("");
    localStorage.clear();
    adivinar = false;
}

