function cooldownLabel(value) {
  return value > 0 ? `${value.toFixed(1)}s` : "Ready";
}

export default class Hud {
  constructor(domElements) {
    this.domElements = domElements;
  }

  updateBlockSelection(label) {
    if (this.domElements.blockLabel) {
      this.domElements.blockLabel.textContent = label;
    }
  }

  updatePlayer(player, enemyCount) {
    const stats = player.getStats();
    if (this.domElements.classLabel) {
      this.domElements.classLabel.textContent = `Class: ${stats.className}`;
    }
    if (this.domElements.weaponLabel) {
      this.domElements.weaponLabel.textContent = `Weapon: ${stats.weaponName}`;
    }
    if (this.domElements.levelLabel) {
      this.domElements.levelLabel.textContent = `Lv ${stats.level}`;
    }
    if (this.domElements.experienceLabel) {
      this.domElements.experienceLabel.textContent =
        `XP ${stats.experience}/${stats.experienceToNextLevel}`;
    }
    if (this.domElements.healthLabel) {
      this.domElements.healthLabel.textContent =
        `HP ${Math.ceil(stats.health)}/${stats.maxHealth}`;
    }
    if (this.domElements.enemyLabel) {
      this.domElements.enemyLabel.textContent = `Enemy ${enemyCount}`;
    }
    if (this.domElements.attackCooldownLabel) {
      this.domElements.attackCooldownLabel.textContent =
        `Attack ${cooldownLabel(stats.cooldowns.basicAttack)}`;
    }
    if (this.domElements.skillCooldownLabel) {
      this.domElements.skillCooldownLabel.textContent =
        `Dash ${cooldownLabel(stats.cooldowns.dashSlash)}`;
    }
  }
}
