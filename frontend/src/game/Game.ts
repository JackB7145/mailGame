import Phaser from "phaser";

export class MailScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Rectangle;
  composeBox!: Phaser.GameObjects.Rectangle; 
  inboxBox!: Phaser.GameObjects.Rectangle;   
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  eKey!: Phaser.Input.Keyboard.Key;

  constructor() { super("mail"); }

  create() {
    this.add.text(16, 16, "Arrow keys. Press E near a box.", { color: "#ffffff" });

    this.player = this.add.rectangle(120, 140, 24, 24, 0x00ff6a);

    this.composeBox = this.add.rectangle(760, 160, 36, 36, 0xff3b30);
    this.composeBox.setStrokeStyle(2, 0xffffff);
    this.add.text(this.composeBox.x - 30, this.composeBox.y + 28, "Compose", { color: "#ffffff" });

    this.inboxBox = this.add.rectangle(760, 420, 36, 36, 0x3b82f6);
    this.inboxBox.setStrokeStyle(2, 0xffffff);
    this.add.text(this.inboxBox.x - 20, this.inboxBox.y + 28, "Inbox", { color: "#ffffff" });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.eKey    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    const kb = this.input.keyboard;
    if (kb) kb.enabled = true;
    this.input.on("pointerdown", () => { const k = this.input.keyboard; if (k) k.enabled = true; });
  }

  update() {
    const dt = this.game.loop.delta / 1000;
    const speed = 220;

    let vx = 0, vy = 0;
    if (this.cursors.left?.isDown)  vx -= 1;
    if (this.cursors.right?.isDown) vx += 1;
    if (this.cursors.up?.isDown)    vy -= 1;
    if (this.cursors.down?.isDown)  vy += 1;
    if (vx && vy) { const inv = Math.SQRT1_2; vx *= inv; vy *= inv; }

    this.player.x += vx * speed * dt;
    this.player.y += vy * speed * dt;

    const nearCompose = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.composeBox.x, this.composeBox.y) < 40;
    const nearInbox = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.inboxBox.x, this.inboxBox.y) < 40;

    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (nearCompose) this.game.events.emit("compose:interact");
      else if (nearInbox) this.game.events.emit("inbox:interact");
    }
  }
}
