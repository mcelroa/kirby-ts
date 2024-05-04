import { GameObj, KaboomCtx } from "kaboom";
import { scale } from "./constants";

export function makePlayer(k: KaboomCtx, posX: number, posY: number) {
  const player = k.make([
    // load sprite from assets defined in main
    k.sprite("assets", { anim: "kirbIdle" }),
    // make a rect relative to the player as a hitbox
    k.area({ shape: new k.Rect(k.vec2(4, 5.9), 8, 11) }),
    // allow collisions with other objects
    k.body(),
    k.pos(posX * scale, posY * scale),
    k.scale(scale),
    k.doubleJump(10),
    k.health(3),
    // set full visibility, will be toggled to zero to give "hurt" effect
    k.opacity(1),
    {
      speed: 300,
      direction: "right",
      isInhaling: false,
      isFull: false,
    },
    "player",
  ]);

  // when player collides with enemy
  player.onCollide("enemy", async (enemy: GameObj) => {
    // enemy can be inhaled
    if (player.isInhaling && enemy.isInhalable) {
      player.isInhaling = false;
      k.destroy(enemy);
      player.isFull = true;
      return;
    }

    // player hp hits 0
    if (player.hp() === 0) {
      k.destroy(player);
      k.go("level-1");
      return;
    }

    // damage player
    player.hurt();

    await k.tween(player.opacity, 0, 0.05, (val) => (player.opacity = val), k.easings.linear);
    await k.tween(player.opacity, 1, 0.05, (val) => (player.opacity = val), k.easings.linear);
  });

  // player collides with exit door
  player.onCollide("exit", () => {
    k.go("level-2");
  });

  const inhaleEffect = k.add([
    k.sprite("assets", { anim: "kirbInhaleEffect" }),
    k.pos(),
    k.scale(scale),
    k.opacity(0),
    "inhaleEffect",
  ]);

  const inhaleZone = player.add([
    k.area({ shape: new k.Rect(k.vec2(0), 20, 4) }),
    k.pos(),
    "inhaleZone",
  ]);

  // runs on every frame as long as game object exists
  inhaleZone.onUpdate(() => {
    if (player.direction === "left") {
      // set position relative to player
      inhaleZone.pos = k.vec2(-14, 8);
      // set position of the inhaleEffect to left of player
      inhaleEffect.pos = k.vec2(player.pos.x - 60, player.pos.y + 0);
      // flip the texture on x axis
      inhaleEffect.flipX = true;
      return;
    }
    inhaleZone.pos = k.vec2(14, 8);
    inhaleEffect.pos = k.vec2(player.pos.x + 60, player.pos.y + 0);
    inhaleEffect.flipX = false;
  });

  // player falls off map
  player.onUpdate(() => {
    if (player.pos.y > 2000) {
      k.go("level-1");
    }
  });

  return player;
}
