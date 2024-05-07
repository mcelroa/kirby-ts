import {
  AreaComp,
  BodyComp,
  DoubleJumpComp,
  GameObj,
  HealthComp,
  KaboomCtx,
  OpacityComp,
  PosComp,
  ScaleComp,
  SpriteComp,
} from "kaboom";
import { scale } from "./constants";

// Create a player as a game object with only specified components
type PlayerGameObj = GameObj<
  SpriteComp &
    AreaComp &
    BodyComp &
    PosComp &
    ScaleComp &
    DoubleJumpComp &
    HealthComp &
    OpacityComp & { speed: number; direction: string; isInhaling: boolean; isFull: boolean }
>;

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
    k.go("level-1");
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

export function setControls(k: KaboomCtx, player: PlayerGameObj) {
  // Get an array of all elements which have inhaleEffect tag
  const inhaleEffectRef = k.get("inhaleEffect")[0];

  k.onKeyDown((key) => {
    switch (key) {
      // left
      case "a":
        player.direction = "left";
        player.flipX = true;
        player.move(-player.speed, 0);
        break;
      // right
      case "d":
        player.direction = "right";
        player.flipX = false;
        player.move(player.speed, 0);
        break;
      // swallow
      case "f":
        if (player.isFull) {
          player.play("kirbFull");
          inhaleEffectRef.opacity = 0;
          break;
        }

        player.isInhaling = true;
        player.play("kirbInhaling");
        inhaleEffectRef.opacity = 1;
        break;
      default:
    }
  });

  k.onKeyPress((key) => {
    if (key === "space") player.doubleJump();
  });

  k.onKeyRelease((key) => {
    if (key === "f") {
      // player isFull
      if (player.isFull) {
        player.play("kirbFull");
        const shootingStar = k.add([
          k.sprite("assets", {
            anim: "shootingStar",
            flipX: player.direction === "right",
          }),
          k.area({ shape: new k.Rect(k.vec2(5, 4), 6, 6) }),
          k.pos(
            player.direction === "left" ? player.pos.x - 80 : player.pos.x + 80,
            player.pos.y + 5
          ),
          k.scale(scale),
          player.direction === "left" ? k.move(k.LEFT, 800) : k.move(k.RIGHT, 800),
          "shootingStar",
        ]);
        // destroy star if it hits wall
        shootingStar.onCollide("platform", () => k.destroy(shootingStar));

        player.isFull = false;
        k.wait(0.01, () => player.play("kirbIdle"));

        return;
      }

      inhaleEffectRef.opacity = 0;
      player.isInhaling = false;
      player.play("kirbIdle");
    }
  });
}

export function makeInhalable(k: KaboomCtx, enemy: GameObj) {
  enemy.onCollide("inhaleZone", () => {
    enemy.isInhalable = true;
  });

  enemy.onCollideEnd("inhaleZone", () => {
    enemy.isInhalable = false;
  });

  enemy.onCollide("shootingStar", (shootingStar: GameObj) => {
    k.destroy(enemy);
    k.destroy(shootingStar);
  });

  const playerRef = k.get("player")[0];
  enemy.onUpdate(() => {
    if (playerRef.isInhaling && enemy.isInhalable) {
      if (playerRef.direction === "right") {
        // suck enemy towards player (left)
        enemy.move(-800, 0);
        return;
      }
      // suck enemy towards player (right)
      enemy.move(800, 0);
    }
  });
}

export function makeFlameEnemy(k: KaboomCtx, posX: number, posY: number) {
  const flame = k.add([
    k.sprite("assets", { anim: "flame" }),
    k.scale(scale),
    k.pos(posX * scale, posY * scale),
    k.area({
      shape: new k.Rect(k.vec2(4, 6), 8, 10),
      collisionIgnore: ["enemy"],
    }),
    k.body(),
    k.state("idle", ["idle", "jump"]),
    { isInhalable: false },
    "enemy",
  ]);

  makeInhalable(k, flame);

  flame.onStateEnter("idle", async () => {
    await k.wait(1);
    flame.enterState("jump");
  });

  flame.onStateEnter("jump", async () => {
    flame.jump(1000);
  });

  flame.onStateUpdate("jump", async () => {
    if (flame.isGrounded()) {
      flame.enterState("idle");
    }
  });

  return flame;
}

export function makeGuyEnemy(k: KaboomCtx, posX: number, posY: number) {
  const guy = k.add([
    k.sprite("assets", { anim: "guyWalk" }),
    k.scale(scale),
    k.pos(posX * scale, posY * scale),
    k.area({
      shape: new k.Rect(k.vec2(2, 3.9), 12, 12),
      collisionIgnore: ["enemy"],
    }),
    k.body(),
    k.state("idle", ["idle", "left", "right", "jump"]),
    { isInhalable: false, speed: 100 },
    "enemy",
  ]);

  makeInhalable(k, guy);

  guy.onStateEnter("idle", async () => {
    await k.wait(1);
    guy.enterState("left");
  });

  guy.onStateEnter("left", async () => {
    guy.flipX = false;
    await k.wait(2);
    guy.enterState("right");
  });

  guy.onStateUpdate("left", () => {
    guy.move(-guy.speed, 0);
  });

  guy.onStateEnter("right", async () => {
    guy.flipX = true;
    await k.wait(2);
    guy.enterState("left");
  });

  guy.onStateUpdate("right", () => {
    guy.move(guy.speed, 0);
  });

  return guy;
}

export function makeBirdEnemy(k: KaboomCtx, posX: number, posY: number, speed: number) {
  const bird = k.add([
    k.sprite("assets", { anim: "bird" }),
    k.scale(scale),
    k.pos(posX * scale, posY * scale),
    k.area({
      shape: new k.Rect(k.vec2(4, 6), 8, 10),
      collisionIgnore: ["enemy"],
    }),
    k.body({ isStatic: true }),
    k.move(k.LEFT, speed),
    k.offscreen({ destroy: true, distance: 400 }),
    "enemy",
  ]);

  makeInhalable(k, bird);

  return bird;
}
