import { KaboomCtx } from "kaboom";
import { scale } from "./constants";

export async function makeMap(k: KaboomCtx, name: string) {
  // load in map data from json file
  const mapData = await (await fetch(`./${name}.json`)).json();

  // create map on the screen
  const map = k.make([k.sprite(name), k.scale(scale), k.pos(0)]);

  const spawnPoints: { [key: string]: [{ x: number; y: number }] } = {};

  //   loop through each layer of the map
  for (const layer of mapData.layers) {
    // the layer is colliders layer
    if (layer.name === "colliders") {
      // loop through each collider in the layer
      for (const collider of layer.objects) {
        // add this object to the map
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), collider.width, collider.height),
            collisionIgnore: ["platform", "exit"],
          }),
          // collider is not exit set body static, else null
          collider.name !== "exit" ? k.body({ isStatic: true }) : null,
          // set each collider at its defined x, y values from mapData
          k.pos(collider.x, collider.y),
          // collider is not exit set tag as platform, else exit
          collider.name !== "exit" ? "platform" : "exit",
        ]);
      }
      continue;
    }

    // the layer is spawnpoints layer
    if (layer.name === "spawnpoints") {
      // loop through each object in this layer
      for (const spawnPoint of layer.objects) {
        // this key already exists in spawnPoints
        if (spawnPoints[spawnPoint.name]) {
          spawnPoints[spawnPoint.name].push({
            x: spawnPoint.x,
            y: spawnPoint.y,
          });
          continue;
        }

        // create array with spawn points at this key
        spawnPoints[spawnPoint.name] = [{ x: spawnPoint.x, y: spawnPoint.y }];
      }
    }
  }

  return { map, spawnPoints };
}
