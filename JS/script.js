
const auth = firebase.auth();
var numSala;
var inPartida = false;

window.onload = () => {
    // var files = firebase.storage().ref().child("").listAll()
    //     .then((res) => {
    //         res.items.forEach(element => {
    //             // console.log(element.name);
    //         });
    //     })

}

var provider = new firebase.auth.GoogleAuthProvider();
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        console.log("existe");
        $("#botones").append("<button class='btn btn-outline-danger' id='btnCerrarSession'>Cerrar sesion</button>");
        $("#nombreUsuario").text("Bienvenido " + user.displayName);
        cerrarSesion();
        agregarJugador(user);
        $("#buscar").click((e) => {
            e.preventDefault();

            // COMPROBACION DE LA LONGITUDA DEL VALUE DEL INPUT
            var nombre = $("#inpUsuario").val();
            nombre = nombre.trim();
            if (user.displayName != nombre && nombre.length > 0) {
                buscarUsuario(user, nombre);
            }
        })
        // console.log(user.displayName);
        firebase.firestore().collection("salas").onSnapshot((result) => {
            result.forEach(element => {
                if (element.data().jugadores.includes(user.displayName) && element.data().jugadores.length > 1) {
                    $("#formulario").addClass("ocultar");
                }

            });
        })



    } else {
        console.log("no existe");
        $("#botones").append("<button class='btn btn-outline-success' id='btnAcceder'>Acceder</button >");
        iniciarSesion();
        $("#nombreUsuario").text("Inicie Sesion")
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
        $("#btnCerrarSession").remove();
        $(this).remove();
        firebase.firestore().collection("salas").doc(localStorage.getItem("numSalam")).delete();
        localStorage.clear();
        firebase.auth().signOut();
    });
    $("#formulario").removeClass("ocultar");

}


const agregarJugador = (user) => {
    var coleccion = firebase.firestore().collection("jugadores");

    coleccion.doc(user.displayName).set({
        id: user.uid
    })

    coleccion.doc(user.displayName).onSnapshot((result) => {
        if (result.data().solicitud != undefined) {

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
                        colecSalas.doc(sala).get()
                            .then((array) => {
                                // AGREGAMOS EL NUEVO USUARIO AL ARRAY Y LUEGO A LA BASE DE DATOS
                                var arrayJugadores = array.data().jugadores;
                                arrayJugadores.push(user.displayName);
                                localStorage.setItem("numSala", sala);

                                colecSalas.doc(sala).update({
                                    jugadores: arrayJugadores
                                })
                            })
                    })

                    // BOTON DENEGAR
                    $("#solDen").click(() => {
                        $("#solicitud").addClass("ocultar");
                        console.log(": " + sala);
                        colecSalas.doc(sala).delete();

                    })
                })

        }
    })
}

const buscarUsuario = (user, nombre) => {
    var coleccion = firebase.firestore().collection("jugadores");
    coleccion.doc(nombre).get()
        .then((result) => {

            if (result.exists) {
                $("#inpUsuario").val("");

                var numSala = parseInt(Math.random() * (100000 - 0) + 0)
                coleccion.doc(nombre).update({
                    solicitud: user.uid + "###" + numSala
                })
                firebase.firestore().collection("salas").doc(numSala + "").set({
                    jugadores: [user.displayName]
                })

                localStorage.setItem("numSala", numSala);
            }
        })
}


// SCRIPT DE PARTIDA
var imagenesQuitadas = []
const getDatosPartida = () => {

}

const setDatosJugada = () => {

}
