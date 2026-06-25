import GameLoop from "./game-loop.js";

const canvas = document.querySelector("#game");

const domElements = {
  blockLabel: document.querySelector("#blockLabel"),
  heightLabel: document.querySelector("#heightLabel"),
  zoomLabel: document.querySelector("#zoomLabel"),
  toolButtons: [...document.querySelectorAll(".tool")],
  buildBtn: document.querySelector("#buildBtn"),
  digBtn: document.querySelector("#digBtn"),
  jumpBtn: document.querySelector("#jumpBtn"),
  zoomOutBtn: document.querySelector("#zoomOutBtn"),
  zoomInBtn: document.querySelector("#zoomInBtn"),
};

const game = new GameLoop(canvas, domElements);
game.start();
