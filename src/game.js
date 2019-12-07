import Player from "./player.js";
import Bullet from "./bullet.js";
import Explosion from "./explosion.js";
import Input from "./input";
import Level from "./level";
import Sound from "./sound";

const GAMESTATE = {
  MENU: 0,
  GAMEINPROGRESS: 1,
  GAMEOVER: 2
};

export default class Game {
  constructor(screenWidth, screenHeight) {
    this.backgroundImage = new Image();
    this.backgroundImage.src = "/starbackground.png";
    this.backgroundImage.yPos = -600;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.playerLaser = new Sound("/laser.m4a", 3, 0.1);
    this.enemyExplosion = new Sound("/enemyExplosion.m4a", 3, 0.25);
    this.playerExplosion = new Sound("/explosion.m4a", 3, 0.15);
    this.player = new Player(this.screenWidth, this.screenHeight, this);
    new Input(this.player, this);
    this.enemies = [];
    this.blocks = [];
    this.screen = -1;
    this.gameState = GAMESTATE.MENU; // initially show the menu screen
    this.bulletPool = []; // array for enemy and player bullets
    this.stats = document.getElementById("stats");
    this.score = document.getElementById("score");
    this.lives = document.getElementById("lives");
    this.hiscore = document.getElementById("hiscore");
    //this.levelComplete = true;
  }

  initialiseGame() {
    this.bulletPool = []; // array for enemy and player bullets
    this.enemies = [];
    this.blocks = [];
    this.playerBulletSpeed = -120;
    this.enemyBulletSpeed = 150;
    this.levelComplete = true;
    this.player.paused = true;
    this.screen++;
    this.ticks = 0; // will be used to keep track of time for alien movement, player invincibility, limiting bullets and any required delays
    this.playerHit = false;
    this.lastPlayerBulletTimeStamp = 0;
    this.delayOver = true; // set to true whenever a delay is over
    this.enemyCharging = false;
    this.explosion = null;
    this.exitAngle = 0;
    this.exitPos = {
      x: 0,
      y: 0
    };
    this.enemyAttacking = 0;
    this.nextDistance = 0;
    this.waveCentre = [
      {
        x: 300,
        y: -200
      },
      {
        x: this.screenWidth - 300,
        y: -200
      }
    ];
    this.radius = {
      x: 300,
      y: 600
    };
    this.waveXDisp = [0, -0];
    this.backgroundImage.yPos = -600;
    this.level = new Level(this.screen, this.screenWidth, this.screenHeight); // initialise the first level
    this.enemies = this.level.getEnemies();
    this.blocks = this.level.getBlocks(); // ...and an array of blocks and their positions
    this.enemyCharging = false;
    this.chargingEnemy = Math.floor(Math.random() * this.enemies.length);
    this.waiting = false;
    this.delayOver = this.screen === 0 ? true : false;
  }

  start() {
    if (this.gameState === GAMESTATE.MENU) {
      this.initialiseGame();
      this.gameState = GAMESTATE.GAMEINPROGRESS;
    }
  }

  gameOver() {
    this.screen = -1;
    this.gameState = GAMESTATE.GAMEOVER;

    //this.playerLaser.pause();
    //this.playerExplosion.pause();
  }

  shootBullet(entity) {
    if (this.gameState === GAMESTATE.GAMEINPROGRESS) {
      //console.log("shoot bullet");
      if (entity === this.player && !entity.paused) {
        // do not allow a player bullet to be fired until a specified time has elapsed
        if (Date.now() - this.lastPlayerBulletTimeStamp > 300) {
          this.bulletPool.push(
            new Bullet(
              entity.position.x + entity.width / 2,
              entity.position.y,
              this.playerBulletSpeed, // speed of player bullets
              entity.bulletImage
            )
          );

          this.playerLaser.play();
          this.lastPlayerBulletTimeStamp = Date.now();
        }
      } else if (entity.inPlay && !entity.paused) {
        this.bulletPool.push(
          new Bullet(
            entity.position.x + entity.width / 2,
            entity.position.y,
            this.enemyBulletSpeed, // speed of enemy bullets
            entity.bulletImage
          )
        );
      }
    }
  }

  update(delta) {
    if (this.gameState !== GAMESTATE.GAMEINPROGRESS) {
      return;
    }
    //this.ticks++;

    // update player
    if (this.player != null) this.player.update(delta);
    // update blocks

    this.blocks.forEach(block => {
      block.update(delta);
      //block.speed.x = 0;
    });
    // update enemies
    this.moveEnemies(delta);
    // update collisions
    this.checkForCollisions(delta);
    // update explosions
    this.checkForExplosions(delta);

    // when all enemies defeated, thrust the player ship upward a few seconds, reset variables 7 move to next level
    if (this.levelComplete) {
      //this.levelComplete = false;
      //this.initialiseGame();
      //console.log("game init")
      if (this.delayOver) {
        this.thrust();
      } else {
        this.delay(2000, () => {
          this.delayOver = true;
        });
      }
    }
  }

  thrust() {
    if (this.backgroundImage.yPos < 0) {
      //console.log("thrust "+this.backgroundImage.yPos);
      this.enemies.forEach(enemy => {
        enemy.position.y += 3;
      });
      // do the between levels player thrust upwards routine
      this.backgroundImage.yPos += 3;
    } else {
      // initial player thrust is now over

      // when the player first meets the enemies they are paused for a short time
      this.delay(300, () => {
        this.backgroundImage.yPos = -600;
        this.levelComplete = false;
        this.enemies.forEach(enemy => {
          enemy.paused = false;
        });

        this.player.paused = false;

        //this.delayOver = false;

        //this.initialiseGame();
      });

      // wait a couple of seconds, reset variables and start a new level...
      // move the background image back above the screen ready for the end of the next level
      // (top and bottom half of the background image are the same so the change is unnoticeable)
    }
  }

  draw(ctx) {
    if (this.gameState === GAMESTATE.MENU) {
      this.stats.style.display = "none";

      ctx.rect(0, 0, this.screenWidth, this.screenHeight);
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = "#e61ce1";
      ctx.font = "18px dejavu sans mono";
      ctx.fillText(
        "Controls",
        this.screenWidth / 2,
        this.screenHeight / 2 - 40
      );
      ctx.fillStyle = "#a21ce6";
      ctx.fillText(
        "Use keyboard arrows to move left and right, and <ctrl> to fire.",
        this.screenWidth / 2,
        this.screenHeight / 2 + 20
      );
      ctx.fillStyle = "#741ce6";
      ctx.fillText(
        "Press <space> to start. Good luck an' go ahead!",
        this.screenWidth / 2,
        this.screenHeight / 2 + 80
      );
      document.getElementById("gameScreen").focus();
    } else if (this.gameState === GAMESTATE.GAMEINPROGRESS) {
      this.stats.style.display = "flex";
      this.drawBackground(ctx);
      this.player.draw(ctx);

      if (this.blocks.length > 0) {
        this.blocks.forEach(block => {
          block.draw(ctx);
        });
      }
      this.enemies.forEach(enemy => {
        enemy.draw(ctx);
      });

      if (this.bulletPool.length > 0) {
        this.bulletPool.forEach(bullet => {
          bullet.draw(ctx);
        });
      }
      this.lives.innerHTML = this.player.lives;
      this.score.innerHTML = this.player.score;
      this.hiscore.innerHTML = this.player.hiscore;
      if (this.explosion != null) this.explosion.draw(ctx);
    } else if (this.gameState === GAMESTATE.GAMEOVER) {
      this.drawBackground(ctx);
      ctx.textAlign = "center";
      ctx.fillStyle = "#e61ce1";
      ctx.font = "24px dejavu sans mono";
      ctx.fillText("Game Over", this.screenWidth / 2, this.screenHeight / 2);
      // wait a couple of seconds then load a new game
      this.delay(3000, () => {
        this.gameState = GAMESTATE.MENU;
      });
    }
  }

  moveEnemies(delta) {
    if (!delta) return;
    //this.now = Date.now();
    this.enemies.forEach((enemy, i) => {
      if (
        (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) *
          (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) +
          (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) *
            (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) <=
        100000
      ) {
        enemy.inPlay = true;
      }
      if (Math.random() > 0.995) {
        this.shootBullet(enemy);
      }

      if (enemy.enemyType === 0) {
        if (
          enemy.inPlay &&
          (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) *
            (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) +
            (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) *
              (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) >
            400000
        ) {
          enemy.position.x = this.screenWidth;
          enemy.position.y = this.screenHeight / 2;
          enemy.angle = 180;
          enemy.inPlay = false;
        } else if (
          enemy.inPlay &&
          (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) *
            (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) +
            (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) *
              (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) >
            100000
        ) {
          enemy.angle -= 2;
        }
      } else if (enemy.enemyType === 1) {
        if (
          enemy.inPlay &&
          (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) *
            (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) +
            (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) *
              (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) >
            400000
        ) {
          enemy.position.x = this.screenWidth;
          enemy.position.y = this.screenHeight / 2;
          enemy.angle = 180;
          enemy.inPlay = false;
        } else if (
          enemy.inPlay &&
          (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) *
            (enemy.position.x + enemy.width / 2 - this.screenWidth / 2) +
            (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) *
              (enemy.position.y + enemy.height / 2 - this.screenHeight / 2) >
            100000
        ) {
          enemy.angle += 1;
        }
      } else if (enemy.enemyType === 2) {
        if (enemy.movement === 0) {
          enemy.moveTo(
            400 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
            enemy.start.y + 600,
            delta,
            delta
          );
          if (Date.now() - this.level.startEnemyWaveCycle >= 10000) {
            enemy.movement += 1;
          }
        } else if (enemy.movement === 1) {
          if (
            enemy !==
            this.enemies.filter(item => item.enemyType === 2)[
              this.enemyAttacking
            ]
          ) {
            enemy.moveTo(
              400 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
              enemy.position.y,
              delta,
              delta
            );
          } else {
            // enemy swoop...
            enemy.position.y += 20 * (delta / 1000);
            enemy.moveTo(
              260 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
              this.player.position.y - 125,
              delta,
              delta
            );
            if (Math.random() > 0.85) {
              this.shootBullet(enemy);
            }
            if (enemy.position.y >= this.player.position.y - 125) {
              enemy.movement = 2;
            }
          }
        } else if (enemy.movement === 2) {
          if (
            enemy !==
            this.enemies.filter(item => item.enemyType === 2)[
              this.enemyAttacking
            ]
          ) {
            enemy.moveTo(
              400 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
              enemy.position.y,
              delta,
              delta
            );
          } else {
            enemy.moveTo(
              this.player.position.x - 150,
              this.player.position.y - 125,
              delta * 2,
              delta * 2
            );
            if (Math.random() > 0.85) {
              this.shootBullet(enemy);
            }
            if (
              Math.abs(enemy.position.x - (this.player.position.x - 150)) <
                30 &&
              Math.abs(enemy.position.y - (this.player.position.y - 125)) < 30
            ) {
              enemy.movement = 3;
            }
          }
        } else if (enemy.movement === 3) {
          if (
            enemy !==
            this.enemies.filter(item => item.enemyType === 2)[
              this.enemyAttacking
            ]
          ) {
            enemy.moveTo(
              400 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
              enemy.position.y,
              delta,
              delta
            );
          } else {
            enemy.moveTo(
              this.player.position.x + 150,
              this.player.position.y - 125,
              delta * 2,
              delta * 2
            );
            if (Math.random() > 0.9) {
              this.shootBullet(enemy);
            }
            if (
              Math.abs(enemy.position.x - (this.player.position.x + 150)) <
                30 &&
              Math.abs(enemy.position.y - (this.player.position.y - 125)) < 30
            ) {
              enemy.movement = 4;
            }
          }
        } else if (enemy.movement === 4) {
          if (
            enemy !==
            this.enemies.filter(item => item.enemyType === 2)[
              this.enemyAttacking
            ]
          ) {
            enemy.moveTo(
              400 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
              enemy.start.y + 600,
              delta,
              delta
            );
          } else {
            enemy.moveTo(
              400 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
              enemy.start.y + 600,
              delta,
              delta * 2
            );
            if (
              Math.abs(
                enemy.position.x -
                  (400 * Math.sin(Date.now() * 0.0015) + enemy.start.x)
              ) < 20 &&
              Math.abs(enemy.position.y - (600 + enemy.start.y)) < 20
            ) {
              enemy.position.x =
                400 * Math.sin(Date.now() * 0.0015) + enemy.start.x;
              enemy.position.y = enemy.start.y + 600;
              enemy.movement = 0;
              this.level.startEnemyWaveCycle = Date.now();
              this.enemyAttacking += 1;
              if (
                this.enemyAttacking >=
                this.enemies.filter(item => item.enemyType === 2).length
              ) {
                this.enemyAttacking = 0;
              }
            }
          }
        }
      } else if (enemy.enemyType === 3) {
        if (enemy.movement === 0) {
          enemy.moveTo(
            414 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
            enemy.start.y + 600,
            delta,
            delta
          );
          if (
            Date.now() - this.level.startEnemyWaveCycle >= 10000 &&
            enemy.position.x >= enemy.start.x
          ) {
            enemy.movement += 1;
          }
        } else if (enemy.movement === 1) {
          enemy.position.y += 130 * (delta / 1000);
          if (Math.abs(enemy.position.y - (600 + enemy.start.y)) > 150) {
            enemy.movement = 2;
          }
        } else if (enemy.movement === 2) {
          enemy.angle = 0;
          enemy.position.x -= 250 * (delta / 1000);
          if (enemy.position.x < 0) {
            enemy.movement += 1;
          }
        } else if (enemy.movement === 3) {
          enemy.angle = 180;
          enemy.position.x += 250 * (delta / 1000);
          if (enemy.position.x > this.screenWidth) {
            enemy.movement += 1;
          }
        } else if (enemy.movement === 4) {
          enemy.angle = 270;
          enemy.moveTo(
            414 * Math.sin(Date.now() * 0.0015) + enemy.start.x,
            enemy.start.y + 600,
            delta,
            delta * 2
          );
          /*if (
            Math.abs(enemy.position.x - enemy.start.x) <= 20 &&
            Math.abs(enemy.position.y - (600 + enemy.start.y)) <= 20
          ) {
            enemy.position.x =
              414 * Math.sin(Date.now() * 0.0015) + enemy.start.x;
            //enemy.position.y = enemy.start.y;
            enemy.movement = 0;
          }*/
        }
      }
      enemy.update(delta);
    });
  }

  checkForCollisions(delta) {
    // check for and handle any player, enemy or screen boundary collisions with bullets
    if (this.bulletPool.length > 0) {
      this.bulletPool.forEach((bullet, i) => {
        bullet.update(delta);
        if (
          (bullet.speed === this.playerBulletSpeed &&
            bullet.position.y < 500) ||
          (bullet.speed === this.enemyBulletSpeed &&
            bullet.position.y > this.screenHeight)
        ) {
          this.bulletPool.splice(i, 1);
        }
        // player and enemy bullet collision
        if (
          bullet.collidesWith(this.player) &&
          bullet.speed.y === this.enemyBulletSpeed &&
          !this.playerHit
        ) {
          this.bulletPool.splice(i, 1);

          this.explosion = new Explosion(
            this.player.position.x,
            this.player.position.y,
            "./explosion.png"
          );
          if (this.gameState === GAMESTATE.GAMEINPROGRESS) {
            this.playerExplosion.play();
          }
          //this.player.playerHit();

          this.playerHit = true;
          this.player.lives -= 1;
          if (this.player.lives <= 0) {
            // game over
            setTimeout(() => {
              if (this.player.score > this.player.hiscore) {
                localStorage.setItem("hiscore", this.player.score);
              }
              this.player.reset();
              this.gameOver();
            }, 2000);
          } else {
            // lose a life routine
            setTimeout(() => {
              this.playerHit = false;
            }, 3000);
          }
        }

        this.blocks.forEach((block, k) => {
          if (bullet.collidesWith(block) && bullet.speed.y === -120) {
            this.bulletPool.splice(i, 1);
            //this.player.incrementScore(enemy.enemyType);
            //console.log("collision");
            this.blocks.splice(k, 1);
          }
        });

        this.enemies.forEach((enemy, j) => {
          if (bullet.collidesWith(enemy) && bullet.speed.y === -120) {
            this.bulletPool.splice(i, 1);
            this.player.incrementScore(enemy.enemyType);
            this.explosion = new Explosion(
              enemy.position.x,
              enemy.position.y,
              "./explosion.png"
            );
            if (this.gameState === GAMESTATE.GAMEINPROGRESS) {
              this.enemyExplosion.play();
            }
            if (j < this.enemyAttacking) {
              this.enemyAttacking -= 1;
            }
            this.enemies.splice(j, 1);
            if (this.enemies.length <= 0) {
              setTimeout(() => {
                this.initialiseGame();
              }, 1300);
            }
          } else if (this.player.collidesWith(enemy) && !this.playerHit) {
            this.explosion = new Explosion(
              this.player.position.x,
              this.player.position.y,
              "./explosion.png"
            );
            if (this.gameState === GAMESTATE.GAMEINPROGRESS) {
              this.playerExplosion.play();
            }
            //this.player.playerHit();

            this.playerHit = true;
            this.player.lives -= 1;
            if (this.player.lives <= 0) {
              // game over
              setTimeout(() => {
                if (this.player.score > this.player.hiscore) {
                  localStorage.setItem("hiscore", this.player.score);
                }
                this.player.reset();
                this.gameOver();
              }, 2000);
            } else {
              // lose a life routine
              setTimeout(() => {
                this.playerHit = false;
              }, 3000);
            }
          }
        });
      });
    }
  }
  checkForExplosions(delta) {
    if (this.explosion != null) {
      if (this.explosion.readyForDeletion === true) {
        this.explosion = null;
      } else {
        this.explosion.update(delta);
      }
    }
  }
  delay(time, callback) {
    if (!this.waiting) {
      this.present = Date.now();
      this.waiting = true;
    }
    if (Date.now() - this.present > time) {
      this.waiting = false;
      this.delayOver = true;
      callback();
    }
  }
  drawBackground(ctx) {
    ctx.drawImage(
      this.backgroundImage,
      0, // source (spritesheet file) x
      0, // source (spritesheet file) y
      800, // source (spritesheet file) width
      1200, // source (spritesheet file) height
      0, // gamescreen x
      this.backgroundImage.yPos, // gamescreen y
      this.screenWidth, // gamescreen width
      this.screenHeight * 2 // gamescreen height (twice screen height as it's a scrolling background)
    );
  }
}
