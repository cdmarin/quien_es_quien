const auth = firebase.auth();
var miPersonaje = false;
var imagenesQuitadas = []
var adivinar = false;


firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        $("#botones").append("<button class='btn btn-outline-danger' id='btnCerrarSession'>Cerrar sesion</button>");
        $("#nombreUsuario").text("Bienvenido " + user.displayName);
        cerrarSesion();
        agregarJugador(user);
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

/****************************************************************  SCRIPT DE PARTIDA ***********************************************/

const cargarArchivos = () => {
    firebase.firestore().collection("salas").doc("sala-" + localStorage.getItem("numSala")).onSnapshot((result) => {
        console.log(localStorage.getItem("numSala"));
        var cond = false;
        if (result.exists && result.data().jugadores.length > 1) {
            cond = true;
        }

        if (cond) {
            $("#formulario").addClass("ocultar");
            $("#secJuego").find("*").addBack().removeClass("ocultar");

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
                $("#mipersonaje").attr("src", localStorage.getItem("url"));
            }

            // EVENTO  QUE ESCUCHA SI SE HA CAMBIADO EL TURNO DEL JUGADOR
            firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"))
                .onSnapshot((result) => {
                    if (result.exists) {
                        if (result.data().turno == localStorage.getItem("numJugador")) {
                            $("#turno").text("ES TU TURNO");
                        }
                        else {
                            $("#turno").text("ES EL TURNO DEL RIVAL");
                        }
                    }
                })

            // EVENTO DEL BOTON DE ACEPTAR
            $("#aceptar").click(() => {
                var jugada = firebase.firestore().collection("salas").doc("jugadas-" + localStorage.getItem("numSala"))

                jugada.get().then((result) => {

                    if ($(".seleccionado").length > 0) {
                        var array = result.data().miPersonaje;
                        array[localStorage.getItem("numJugador")] = $(".seleccionado").attr("id");
                        jugada.update({
                            miPersonaje: array
                        })

                        var url = $(".seleccionado").css("background-image");
                        url = url.replace("url(\"", "");
                        url = url.replace("\")", "");
                        localStorage.setItem("url", url)

                        $(".seleccionado").removeClass("seleccionado");
                    }
                    else {
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


                })

            })

            $("#adivinar").click(() => {
                if (adivinar) {
                    $(".adivinado").removeClass("adivinado");
                    adivinar = false;
                }
                else {
                    adivinar = true;
                }
            })
        }
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
        var array = result.data().quitadosPers[localStorage.getItem("numJugador")];
        array = array.split("-");

        for (let i = 0; i < array.length; i++) {
            if (array[i].length > 1) {
                $("#" + array[i]).addClass("quitado");
            }
        }
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
                        var url = $(this).css("background-image");
                        url = url.replace("url(\"", "");
                        url = url.replace("\")", "");
                        $("#mipersonaje").attr("src", url);
                        array[localStorage.getItem("numJugador")] = $(this).attr("id");
                    }

                }
                else {
                    if ($(this).attr("class").includes("quitado")) {
                        $(this).removeClass("quitado");
                    }
                    else {
                        $(this).addClass("quitado");
                    }

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
    imagenesQuitadas = [];
    localStorage.clear();
}

