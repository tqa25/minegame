const ATTACK_START_OFFSET = 0.35;

function getAttackSpace(point, origin, facing) {
  const planarPoint = point.clone();
  const planarOrigin = origin.clone();
  planarPoint.y = 0;
  planarOrigin.y = 0;

  const forward = facing.clone().setY(0).normalize();
  const right = new planarPoint.constructor(-forward.z, 0, forward.x);
  const offset = planarPoint.sub(planarOrigin);

  return {
    forwardProgress: offset.dot(forward),
    lateralDistance: Math.abs(offset.dot(right)),
  };
}

export default class CombatSystem {
  resolvePlayerAttack(player, enemies, attack) {
    if (!attack) return { hits: 0, defeated: 0, xpAwarded: 0 };

    let hits = 0;
    let defeated = 0;
    let xpAwarded = 0;
    const facing = attack.facing.clone().normalize();
    const start = attack.origin
      .clone()
      .addScaledVector(facing, ATTACK_START_OFFSET);
    const reach = attack.dashDistance || attack.range;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;

      const enemyPosition = enemy.position.clone();
      const { forwardProgress, lateralDistance } = getAttackSpace(
        enemyPosition,
        start,
        facing,
      );

      const inRange =
        forwardProgress >= 0
        && forwardProgress <= reach
        && lateralDistance <= attack.radius;

      if (!inRange) continue;
      hits += 1;
      if (enemy.takeDamage(attack.damage)) {
        defeated += 1;
        xpAwarded += enemy.experienceReward;
      }
    }

    return { hits, defeated, xpAwarded, damage: attack.damage };
  }

  resolveEnemyAttack(attack, player) {
    if (!attack) return false;
    return player.takeDamage(attack.damage);
  }
}
