import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

export const ROWS = 15;
export const COLS = 15;
export const shipsLengths = [3, 4, 4, 4, 5];

const firebaseConfig = {
    apiKey: "AIzaSyD7ZE2FO5GsI8HtveqrwFtovzpzWEixHKk",
    authDomain: "battleship-war-c5358.firebaseapp.com",
    projectId: "battleship-war-c5358",
    storageBucket: "battleship-war-c5358.firebasestorage.app",
    messagingSenderId: "135065479581",
    appId: "1:135065479581:web:fc6a0f9b2cc6f4c583a774",
    measurementId: "G-NLGEPDLK5T",
    databaseURL: "https://battleship-war-c5358-default-rtdb.asia-southeast1.firebasedatabase.app"  // Add this line
};

// // Initialize Firebase
const app = initializeApp(firebaseConfig);

// // Get the Authentication
const auth = getAuth(app);

signInWithEmailAndPassword(auth, "dvireteui1@gmail.com", "dk0524334898")
    .then((userCredential) => {
        const user = userCredential.user;
    })
    .catch((error) => {
        console.error("Authentication failed:", error.message);
    });

// // Get a reference to the database
export const database = getDatabase(app);

import verticalFirstShip from "url:./Images/verticalFirstShip.png";
import verticalSecondShip from "url:./Images/verticalSecondShip.png";
import verticalThirdShip from "url:./Images/verticalThirdShip.png";
import verticalFourthShip from "url:./Images/verticalFourthShip.png";
import verticalFifthShip from "url:./Images/verticalFifthShip.png";

import horizontalFirstShip from "url:./Images/horizontalFirstShip.png";
import horizontalSecondShip from "url:./Images/horizontalSecondShip.png";
import horizontalThirdShip from "url:./Images/horizontalThirdShip.png";
import horizontalFourthShip from "url:./Images/horizontalFourthShip.png";
import horizontalFifthShip from "url:./Images/horizontalFifthShip.png";

import opponentFirstSunk from "url:./Images/opponentFirstSunk.png";
import opponentSecondSunk from "url:./Images/opponentSecondSunk.png";
import opponentThirdSunk from "url:./Images/opponentThirdSunk.png";
import opponentFourthSunk from "url:./Images/opponentFourthSunk.png";
import opponentFifthSunk from "url:./Images/opponentFifthSunk.png";

import Winner0 from "url:./Images/Winner0.png";
import Winner1 from "url:./Images/Winner1.png";

import flame from "url:./Images/flame.gif"

import eyal from "url:./Images/Eyal.png";
import clear from "url:./Images/clear.png";

import vroom from "url:./Sounds/vroomSound.m4a";

export const Images = {
    verticalFirstShip,
    verticalSecondShip,
    verticalThirdShip,
    verticalFourthShip,
    verticalFifthShip,

    horizontalFirstShip,
    horizontalSecondShip,
    horizontalThirdShip,
    horizontalFourthShip,
    horizontalFifthShip,

    opponentFirstSunk,
    opponentSecondSunk,
    opponentThirdSunk,
    opponentFourthSunk,
    opponentFifthSunk,

    Winner0,
    Winner1,

    flame,

    eyal,
    clear,
};

export const Sounds = {
    vroom,
}