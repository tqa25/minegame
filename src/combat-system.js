import * as THREE from "three";

function pointToSegmentDistance(point, start, end) {
  const segment = end.clone().sub(start);
  const pointOffset = point.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq === 0) {
    return point.distanceTo(start);
  }
  const t = THREE.MathUtils.clamp(pointOffset.dot(segment) / lengthSq, 0, 1);
  const projection = start.clone().addScaledVector(segment, t);
  return point.distanceTo(projection);
}

export default class CombatSystem {
  resolvePlayerAttack(player, enemies, attack) {
    if (!attack) return { hits: 0, defeated: 0 };

    let hits = 0;
    let defeated = 0;
    const start = attack.origin.clone();
    const end = attack.origin
      .clone()
      .addScaledVector(attack.facing, attack.dashDistance || attack.range);

    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;

      const enemyPosition = enemy.position.clone();
      const offset = enemyPosition.clone().sub(start);
      offset.y = 0;

      let inRange = false;

      if (attack.kind === "dashSlash") {
        inRange = pointToSegmentDistance(enemyPosition, start, end) <= attack.radius;
      } else {
        const distance = offset.length();
        const direction = offset.normalize();
        const facing = attack.facing.clone().normalize();
        const alignment = direction.dot(facing);
        inRange = distance <= attack.range && alignment >= 0.15;
      }

      if (!inRange) continue;
      hits += 1;
      if (enemy.takeDamage(attack.damage)) {
        defeated += 1;
        player.gainExperience(enemy.experienceReward);
      }
    }

    return { hits, defeated };
  }
}
