import GameLoop from "./game-loop.js";

const canvas = document.querySelector("#game");

const domElements = {
  blockLabel: document.querySelector("#blockLabel"),
  heightLabel: document.querySelector("#heightLabel"),
  zoomLabel: document.querySelector("#zoomLabel"),
  classLabel: document.querySelector("#classLabel"),
  weaponLabel: document.querySelector("#weaponLabel"),
  levelLabel: document.querySelector("#levelLabel"),
  experienceLabel: document.querySelector("#experienceLabel"),
  healthLabel: document.querySelector("#healthLabel"),
  enemyLabel: document.querySelector("#enemyLabel"),
  attackCooldownLabel: document.querySelector("#attackCooldownLabel"),
  skillCooldownLabel: document.querySelector("#skillCooldownLabel"),
  toolButtons: [...document.querySelectorAll(".tool")],
  buildBtn: document.querySelector("#buildBtn"),
  digBtn: document.querySelector("#digBtn"),
  jumpBtn: document.querySelector("#jumpBtn"),
  attackBtn: document.querySelector("#attackBtn"),
  skillBtn: document.querySelector("#skillBtn"),
  zoomOutBtn: document.querySelector("#zoomOutBtn"),
  zoomInBtn: document.querySelector("#zoomInBtn"),
  autoBtn: document.querySelector("#autoBtn"),
};

const game = new GameLoop(canvas, domElements);
game.start();
