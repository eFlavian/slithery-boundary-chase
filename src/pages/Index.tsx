
import GameBoard from "@/components/GameBoard";

const Index = () => {
  return <GameBoard />;
};

export default Index;


/**
 PLEASE FIX THE FOLLOWING (to the fixes):

1. When a player dies and gets game over, the corpse should be instant despawn. When user got game over screen, the corpse should not be anymore on map.
2. No matter the resolution, the player should be centered on screen camera. Right now, depeding on resolution of screen player is centered, or more to left etc. It must always be centered.
3. I want to be able to make fast movements like top left (fast W&A pressing of keys to work). Right now if i press fast W and A, player does nothing, i want it instant responsive but with smooth fast animation. When moving now (changing direction) the movement is choppy and waits for a fraction of second. Please fix that and make all movement very smooth.
4. When speed boost goes to 0%, even if player still holds the space bar, speed boost should not be active anymore.
5. If player goes to right, make it impossible for player to go left instantly (it can do maximum 90 degree turns). Is a safety measure because if player goes right and presses left by mistake, it automatically dies (entering own body)
6. Before entering match (spawning), player should be able to choose a name. So make a main menu. In background map should be visible with some players playing. So you can automatically connect player to server already, just need a menu to choose name and press PLAY to spawn the player on map.
7. Enemy players should be on minimap as red triangles. Minimap should not be visible by default. Add 5 yellow dots on map. Random at server start. They also spawn randomly at 60 seconds. (each at 60 seconds, max 5 on map) If player eats one yellow dot, it gets to see the mini map for 10 seconds. So the minimap will be hidden by default, but will be visible for 10 seconds only if player eats a yellow dot. When 3 seconds remain of the visible map, the map should blink. So player knows it will disappear soon.
8. Player spawn should happen at random location on map. Not always at same location. Just check if there is a player at that location, if yes, spawn at another location.
9. I want mouse support. Player should follow the mouse if mouse is focused. If player presses wasd or arrows, disable focus on mouse until player moves mouse again.

**/