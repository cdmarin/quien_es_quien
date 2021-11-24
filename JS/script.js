const auth = firebase.auth();
var adivinar = false;
var temp;
var miNombre;

window.onload = () => {
    $("#info").click(cambiaPestaña);
    $("#juego").click(cambiaPestaña);
    $("#pers").click(cambiaPestaña);

    firebase.storage().ref().child("").listAll()
        .then((result) => {
            $("#verImagenes").empty();
            result.items.forEach(element => {
                firebase.storage().ref(element.name).getDownloadURL()
                    .then((res) => {
                        var img = $("<button class='imgJuego'> </button>");
                        $(img).attr("style", "background-image: url('" + res + "')");
                        $("#verImagenes").append(img);
                    });
            });
        });
}

// COMPRUEBA LA EXISTENCIA DE USUARIOS 
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        miNombre = user.displayName;
        if (!sessionStorage.getItem("numSala")) {
            resetVariables();
        }

        $("#botones").append("<button class='btn btn-outline-danger' id='btnCerrarSession'>Cerrar sesion</button>");
        $("#nombreUsuario").text("Bienvenido " + user.displayName.split(" ")[0]);
        cerrarSesion(user);
        agregarJugador(user);
        muestraUsuarios(user);

        creaImagenes();
        // EVENTO DE BUSCAR JUGADOR
        $("#buscar").click((e) => {
            e.preventDefault();

            // COMPROBACION DE LA LONGITUD DEL VALUE DEL INPUT
            var nombre = $("#inpUsuario").val();
            nombre = nombre.trim();
            if (miNombre != nombre && nombre.length > 0) {
                buscarUsuario(user, nombre);
            }
        })

        // EVENTO DE SALIR DE PARTIDA
        $("#salir").click(() => {
            resetVariables();
            return false;
        })

    } else {
        // NO HAY USUARIO
        $("#formulario").addClass("ocultar");
        $("#secJuego").children("*").addBack().addClass("ocultar");
        $("#imagenes").empty();
        $("#botAcc").append("<button class='btn btn-outline-success' id='btnAcceder'>Acceder</button >");
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
    $(".nav-item").addClass("ocultar")
    $("#insesion").removeClass("ocultar");
};

const cerrarSesion = (user) => {
    $("#btnCerrarSession").click(() => {
        $(this).remove();
        firebase.firestore().collection("jugadores").doc(user.displayName).update({
            solicitud: firebase.firestore.FieldValue.delete()
        })
        firebase.firestore().collection("jugadores").doc(user.displayName).delete();
        firebase.auth().signOut();
        $("#btnCerrarSession").remove();
        resetVariables();
        $("#formulario").addClass("ocultar");

    });
    $("#formulario").removeClass("ocultar");
    $(".nav-item").removeClass("ocultar")
    $("#insesion").addClass("ocultar");

}


function cambiaPestaña() {
    resetVariables();
    $(".pestanya").addClass("ocultar")

    switch (this.id) {
        case "info":
            $("#secInfo").removeClass("ocultar");
            break;
        case "juego":
            $("#formulario").removeClass("ocultar");
            break;
        case "pers":
            $("#personajes").removeClass("ocultar");
            break;
    }

}

const muestraUsuarios = (user) => {
    firebase.firestore().collection("jugadores").onSnapshot((result) => {
        $("#userDisponibles").empty();
        result.forEach(element => {
            if (user.displayName != element.id) {
                $("#userDisponibles").append($("<option value='" + element.id + "'>Ususario: " + element.id + " </option>"));
            }

        });
    })
}

// AGREGA EL JUGADOR A LA SALA TRAS RECIBIR LA INVITACION Y ACEPTAR, SI RECHAZA ELIMINA LA SALA
const agregarJugador = (user) => {
    var coleccion = firebase.firestore().collection("jugadores");

    coleccion.doc(user.displayName).set({
        id: user.uid
    })

    coleccion.doc(user.displayName).onSnapshot((result) => {
        if (result.exists && result.data().solicitud != undefined && !sessionStorage.getItem("numSala")) {

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
                                sessionStorage.setItem("numSala", sala);
                                sessionStorage.setItem("numJugador", 1);
                                if (array.exists) {

                                    colecSalas.doc("sala-" + sala).update({
                                        jugadores: arrayJugadores
                                    })
                                }

                                creaImagenes();
                            })

                    })

                    // BOTON DENEGAR
                    $("#solDen").click(() => {
                        $("#solicitud").addClass("ocultar");
                        colecSalas.doc("sala-" + sala).delete();
                        colecSalas.doc("jugadas-" + sala).delete();
                        coleccion.doc(user.displayName).update({
                            solicitud: firebase.firestore.FieldValue.delete()
                        })
                    })
                })

        }
    })
}

const buscarUsuario = (user, nombre) => {

    if (sessionStorage.getItem("numSala")) {
        resetVariables();
    }

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

                sessionStorage.setItem("numSala", numSala);
                sessionStorage.setItem("numJugador", 0);
                creaImagenes();
            }

            setTimeout(() => {
                if ($("#imagenes").children().length <= 2) {
                    resetVariables();
                    alert(nombre + " no ha aceptado la solicitud ");
                }
            }, 7000);
        })
}

/*
 
 
 
***************************************************************  SCRIPT DE PARTIDA **********************************************
 
 
 
*/


const creaImagenes = () => {
    firebase.firestore().collection("salas").doc("sala-" + sessionStorage.getItem("numSala")).onSnapshot((result) => {
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
                    var conexion = firebase.firestore().collection("salas").doc("jugadas-" + sessionStorage.getItem("numSala"))
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


            if (sessionStorage.getItem("url")) {
                $("#mipersonaje").css("background-image", sessionStorage.getItem("url"));
            }

            // EVENTO  QUE ESCUCHA SI SE HA CAMBIADO EL TURNO DEL JUGADOR

            var jugada = firebase.firestore().collection("salas").doc("jugadas-" + sessionStorage.getItem("numSala"));

            jugada.onSnapshot((result) => {
                if (result.exists) {
                    // COMPROBAMOS QUE LOS PERSONAJES ESTEN ESTABLECIDOS
                    if (!result.data().miPersonaje.includes("")) {
                        $("#turno").removeClass("ocultar");

                        // SI NADIE HA GANADO
                        if (result.data().victoria == undefined) {
                            if (result.data().pregunta == undefined && result.data().respuesta == undefined) {
                                $("#textCambio").text("");
                                $("#pregunta").text("");
                            }

                            $("#pregunta").val("");

                            // SI ES MI TURNO 
                            if (result.data().turno == sessionStorage.getItem("numJugador")) {
                                $("#turno").text("ES TU TURNO");
                                $("#aceptar").removeClass("ocultar")
                                $("#adivinar").removeClass("ocultar")
                                $("#divRespuesta").addClass("ocultar");

                                if (result.data().pregunta == undefined) {
                                    $("#divPregunta").removeClass("ocultar");
                                }

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

                                if (result.data().pregunta != undefined && result.data().pregunta.length > 0 && result.data().respuesta == undefined) {
                                    $("#divRespuesta").removeClass("ocultar");
                                    $("#textCambio").text(result.data().pregunta);
                                }
                            }
                        }
                        // EN EL CASO DE QUE ALGUIEN HAYA GANADO SE MUESTRA EL GANADOR Y SE TERMINA
                        else {
                            $("#secJuego").addClass("ocultar")

                            $("#victoria").removeClass("ocultar");
                            firebase.firestore().collection("salas").doc("sala-" + sessionStorage.getItem("numSala"))
                                .get().then((nombre) => {
                                    $("#titFin").text("LA VICTORIA ES PARA  " + nombre.data().jugadores[result.data().victoria]);

                                    var url = $("#" + result.data().miPersonaje[result.data().victoria]).css("background-image")
                                    $("#imgFin").css("background-image", url);
                                })


                            setTimeout(() => {
                                $("#victoria").addClass("ocultar");
                                resetVariables();
                            }, 7000);
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

                var jugada = firebase.firestore().collection("salas").doc("jugadas-" + sessionStorage.getItem("numSala"))
                jugada.update({
                    respuesta: firebase.firestore.FieldValue.delete(),
                    pregunta: firebase.firestore.FieldValue.delete()
                })

                jugada.get().then((result) => {
                    if (!adivinar) {

                        // CONDICION DE ESTABLECER LOS PERSONAJES
                        if ($(".seleccionado").length > 0 && result.data().miPersonaje.includes("")) {
                            var array = result.data().miPersonaje;
                            array[sessionStorage.getItem("numJugador")] = $(".seleccionado").attr("id");
                            jugada.update({
                                miPersonaje: array
                            })

                            sessionStorage.setItem("url", $(".seleccionado").css("background-image"))

                            $(".seleccionado").removeClass("seleccionado");
                        }

                        // CONDICION DE DESCARTAR LOS PERSONAJES
                        else if (!result.data().miPersonaje.includes("")) {
                            if (result.data().turno == sessionStorage.getItem("numJugador")) {
                                var quitados = document.getElementsByClassName("quitado")
                                var array = "";
                                var quitadosPers = result.data().quitadosPers;
                                for (let i = 0; i < quitados.length; i++) {
                                    array += quitados[i].id + "-";
                                }

                                quitadosPers[sessionStorage.getItem("numJugador")] = array;
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

                        }
                    }
                    else {
                        comprobarAdivinado(jugada);
                    }


                })

            })

            $("#adivinar").click((e) => {

                firebase.firestore().collection("salas").doc("jugadas-" + sessionStorage.getItem("numSala"))
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
                e.preventDefault();
                return false;
            })

            // BOTON DE ENVIAR PREGUNTA
            $("#envPreg").click((e) => {


                if ($("#pregunta").val().length > 0) {
                    $("#textCambio").text("Espera la respuesta del jugador...");
                    $("#divPregunta").addClass("ocultar");


                    var jugada = firebase.firestore().collection("salas").doc("jugadas-" + sessionStorage.getItem("numSala"))
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
                $("#textCambio").text("Espera al jugador...");
                $("#divRespuesta").addClass("ocultar");

                var jugada = firebase.firestore().collection("salas").doc("jugadas-" + sessionStorage.getItem("numSala"))
                jugada.update({
                    respuesta: $("#respuesta").val()
                })

                e.preventDefault();
                return false;
            })
        }
        // SI NO HAY UNA PARTIDA ACTIVA
        else {
            // $("#formulario").removeClass("ocultar");
            $("#secJuego").find("*").addBack().addClass("ocultar");
            $("#imagenes").empty();
        }

        if (!result.exists) {
            resetVariables();
        }
    })

}

// MARCA EN ROJO LOS PERSONAJES REMARCADOS EN ANTERIORES RONDAS
function marcarRojo(conexion) {
    conexion.then((result) => {
        if (result.exists) {
            var array = result.data().quitadosPers[sessionStorage.getItem("numJugador")];
            if (array != undefined && array.length > 0) {
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
        if (sessionStorage.getItem("numJugador") == 1) {
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
    var jugadas = firebase.firestore().collection("salas").doc("jugadas-" + sessionStorage.getItem("numSala"));

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
                    if (result.data().miPersonaje[sessionStorage.getItem("numJugador")] == "") {

                        var array = result.data().miPersonaje;

                        $(".seleccionado").removeClass("seleccionado");
                        $(this).addClass("seleccionado");

                        // SACAMOS LA URL PARA PONERLA EN EL ESPACIO DE MIPERSONAJE
                        $("#mipersonaje").css("background-image", $(this).css("background-image"));
                        array[sessionStorage.getItem("numJugador")] = $(this).attr("id");
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
    firebase.firestore().collection("salas").where("jugadores", "array-contains", miNombre).get().then((result) => {
        result.forEach(element => {
            firebase.firestore().collection("salas").doc("jugadas" + element.id.split("-")[1]).delete()
            firebase.firestore().collection("salas").doc(element.id).delete();
        });
    })

    $("#mipersonaje").css("background-image", "");
    $("textCambio").text("");
    sessionStorage.clear();
    adivinar = false;
    $("#adivinar").removeClass("clikado");
    $(".pestanya").addClass("ocultar")
    $("#formulario").removeClass("ocultar")

}

