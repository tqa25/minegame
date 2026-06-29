export const PLAYER_CLASS = {
  name: "Warrior",
  weaponName: "Iron Sword",
  baseMaxHealth: 100,
  baseAttackPower: 10,
  walkSpeed: 3.9,
  runSpeed: 6.1,
  levelHealthGain: 16,
  levelAttackGain: 2,
  skillCooldownFactor: 0.93,
};

export const EXPERIENCE_PER_ENEMY = 10;
export const INITIAL_EXPERIENCE_TO_LEVEL = 30;
export const EXPERIENCE_STEP_PER_LEVEL = 15;

export const BASIC_ATTACK = {
  name: "Basic Attack",
  range: 1.9,
  radius: 1.15,
  cooldown: 0.45,
  animationDuration: 0.34,
  damageMultiplier: 1,
};

export const DASH_SLASH = {
  name: "Dash Slash",
  range: 2.8,
  radius: 1.35,
  cooldown: 3,
  animationDuration: 0.48,
  dashDuration: 0.18,
  dashDistance: 2.6,
  damageMultiplier: 1.8,
};

export const ENEMY_BASE = {
  maxHealth: 24,
  attackDamage: 7,
  moveSpeed: 2.2,
  aggroRange: 8.5,
  attackRange: 1.35,
  attackCooldown: 1.1,
  despawnRange: 28,
  passiveDeaggroTime: 3.5,
};

export const ENEMY_SPAWNER = {
  maxAlive: 6,
  spawnInterval: 1.5,
  minSpawnDistance: 6,
  maxSpawnDistance: 15,
  passiveChance: 0.3,
};

export const PLAYER_RESPAWN_SECONDS = 2;
