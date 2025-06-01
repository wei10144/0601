/*
 * 👋 Hello! This is an ml5.js example made and shared with ❤️.
 * Learn more about the ml5.js project: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 *
 * This example demonstrates hand tracking on live video through ml5.handPose.
 */

let video;
let handposeModel;
let predictions = [];

// 在 draw() 外部加上這些變數
let cardPositions = [];
let draggingCardIndex = null;

// 在 draw() 外部加上
let correctMap = {
  "林逸農": "2D繪圖",
  "賴婷玲": "教學原理",
  "顧大維": "平面設計",
  "陳慶帆": "程式設計",
  "王怡萱": "視訊編輯"
};
let showCorrect = false;
let correctTimer = 0;

// 在 draw() 外部加上
let welcomeStage = 0; // 0: 歡迎, 1: 說明, 2: 遊戲開始
let welcomeTimer = 0;

// 在 draw() 外部加上
let score = 0;

// 在 draw() 外部加上
let answeredCards = []; // 記錄已經答對的卡片索引

// 在 draw() 外部加上
let finishShowTime = 0;
let finished = false;
let finalGameStarted = false;
let finalGameAnswered = false;
let finalGameResult = ""; // "yes" or "no"

// 在 draw() 外部加上
let finalMsgShowTime = 0;
let showMsg = "";

// 在 draw() 外部加上
let finalResultShowTime = 0;
let finalResultMsg = "";

// 在 draw() 外部加上
let showFirework = false;
let fireworkStartTime = 0;
let fireworks = [];

// Firework 粒子物件
class FireworkParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    let angle = random(TWO_PI);
    let speed = random(3, 7);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
    this.alpha = 255;
    this.color = color;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.08; // 重力
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.alpha -= 4;
  }
  show() {
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], this.alpha);
    ellipse(this.x, this.y, 8);
  }
  isDead() {
    return this.alpha < 0;
  }
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  if (predictions.length > 0) {
  const landmarks = predictions[0].landmarks;
  if (landmarks && landmarks.length > 8) {
    const indexTip = landmarks[8]; // 取第8個點
    const x = indexTip[0];
    const y = indexTip[1];

    // 繪製點
    fill(0, 255, 255);
    noStroke();
    ellipse(x, y, 10);
  }
}


  // Initialize handpose model
  handposeModel = ml5.handpose(video, modelReady);
  handposeModel.on("predict", gotHands);

  // 初始化字卡位置
  let cardNames = ["林逸農", "賴婷玲", "顧大維", "陳慶帆", "王怡萱"];
  let cardWidth = 90;
  let cardHeight = 40;
  let cardGap = 20;
  let totalWidth = cardNames.length * cardWidth + (cardNames.length - 1) * cardGap;
  let x = (width - video.width) / 2;
  let y = (height - video.height) / 2;
  let startX = x + (video.width - totalWidth) / 2;
  let cardY = y + 20;
  cardPositions = [];
  for (let i = 0; i < cardNames.length; i++) {
    let cardX = startX + i * (cardWidth + cardGap);
    cardPositions.push({ x: cardX, y: cardY });
  }
}

function modelReady() {
  console.log("Handpose model loaded!");
}

function draw() {
  background('#f2e8cf');

  // 視訊畫面
  let x = (width - video.width) / 2;
  let y = (height - video.height) / 2;
  push();
  translate(x + video.width, y);
  scale(-1, 1);
  tint(255, 220);
  image(video, 0, 0, video.width, video.height);
  pop();
  noTint();

  // --- 第二題（只顯示問題和三個選項框，其餘內容不顯示）---
  if (showSecondQuestion) {
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("哪一間教室可以吃東西？", width / 2, height / 2 - 80);

    // 選項框參數
    let boxW = 100;
    let boxH = 60;
    let gap = 40;
    let totalW = boxW * 3 + gap * 2;
    let startX = width / 2 - totalW / 2;
    let boxY = height / 2 + 20;
    let options = ["102", "105", "110"];

    // 食指偵測要在 pointer 宣告之後
    let pointer = null;
    if (predictions.length > 0 && predictions[0].landmarks && predictions[0].landmarks[8]) {
      let indexTip = predictions[0].landmarks[8];
      let mirroredX = width - (indexTip[0]);
      let mirroredY = indexTip[1];
      pointer = [
        mirroredX - (width - video.width) / 2,
        mirroredY - (height - video.height) / 2
      ];
      fill(255, 0, 0);
      noStroke();
      ellipse(pointer[0], pointer[1], 18);
    }

    // 選項框
    for (let i = 0; i < 3; i++) {
      let bx = startX + i * (boxW + gap);
      fill(0);
      stroke(255, 180, 0);
      strokeWeight(3);
      rect(bx, boxY, boxW, boxH, 12);
      noStroke();
      fill(255, 180, 0);
      textSize(28);
      text(options[i], bx + boxW / 2, boxY + boxH / 2);

      // 判斷食指是否選到
      if (
        !secondAnswered &&
        pointer &&
        pointer[0] > bx &&
        pointer[0] < bx + boxW &&
        pointer[1] > boxY &&
        pointer[1] < boxY + boxH
      ) {
        secondAnswered = true;
        secondAnswer = options[i];
        if (secondAnswer === "105") {
          secondMsg = "答對了";
        } else {
          secondMsg = "答錯了";
        }
        secondMsgTime = millis();
      }
    }

    // 顯示答題結果2秒
    if (secondAnswered) {
      fill(secondAnswer === "105" ? "green" : "red");
      textSize(36);
      textAlign(CENTER, CENTER);
      text(secondMsg, width / 2, height / 2);
      if (millis() - secondMsgTime > 2000) {
        gameEnded = true;
      }
    }
    return; // 這行很重要！只顯示第二題內容，其餘全部不顯示
  }

  // 歡迎與說明階段
  if (welcomeStage < 2) {
    fill(255, 255, 0);
    textSize(36);
    textAlign(CENTER, CENTER);
    if (welcomeStage === 0) {
      text("歡迎光臨教科小遊戲", width / 2, height / 2);
      if (welcomeTimer === 0) welcomeTimer = millis();
      if (millis() - welcomeTimer > 2000) {
        welcomeStage = 1;
        welcomeTimer = millis();
      }
      return;
    } else if (welcomeStage === 1) {
      textSize(24);
      text("用食指把上面的老師字卡拉到下面老師教學科目的格子", width / 2, height / 2);
      if (millis() - welcomeTimer > 2000) {
        welcomeStage = 2;
      }
      return;
    }
  }

  // --- 新增五個字卡 ---
  let cardNames = ["林逸農", "賴婷玲", "顧大維", "陳慶帆", "王怡萱"];
  let cardWidth = 90;
  let cardHeight = 40;
  let cardGap = 20;
  let totalWidth = cardNames.length * cardWidth + (cardNames.length - 1) * cardGap;
  let startX = x + (video.width - totalWidth) / 2;
  let cardY = y + 20; // 視訊上方 20px

  // --- 新增五個桶子 ---
  let barrelNames = ["視訊編輯", "教學原理", "2D繪圖", "平面設計", "程式設計"];
  let barrelWidth = 90;
  let barrelHeight = 60;
  let barrelGap = 30;
  let totalBarrelWidth = barrelNames.length * barrelWidth + (barrelNames.length - 1) * barrelGap;
  let barrelStartX = x + (video.width - totalBarrelWidth) / 2;
  let barrelY = y + video.height - barrelHeight - 30; // 視訊下方 30px

  // --- 計分板 ---
  // 找到「視訊編輯」桶子的 X 座標
  let scoreBarrelIndex = barrelNames.indexOf("視訊編輯");
  let scoreBarrelX = barrelStartX + scoreBarrelIndex * (barrelWidth + barrelGap);
  let scoreBarrelY = barrelY - 60; // 桶子上方 60px

  // 畫計分板
  fill(255, 255, 200);
  stroke(0);
  strokeWeight(2);
  rect(scoreBarrelX, scoreBarrelY, barrelWidth, 40, 8);
  noStroke();
  fill(0);
  textSize(16);
  textAlign(CENTER, CENTER);
  text("答對題數", scoreBarrelX + barrelWidth / 2, scoreBarrelY + 12);
  textSize(24);
  text(score, scoreBarrelX + barrelWidth / 2, scoreBarrelY + 30);

  // --- 食指與字卡互動 ---
  let pointer = null;
  if (predictions.length > 0 && predictions[0].landmarks && predictions[0].landmarks[8]) {
    let indexTip = predictions[0].landmarks[8];
    // 轉換為畫布座標（左右翻轉後的 x）
    let mirroredX = width - (indexTip[0]);
    let mirroredY = indexTip[1];
    let rawPointer = [
      mirroredX - (width - video.width) / 2,
      mirroredY - (height - video.height) / 2
    ];
    // 讓 pointer 幾乎完全跟隨手指
    pointer = rawPointer;
    fill(255, 0, 0);
    noStroke();
    ellipse(pointer[0], pointer[1], 18);

    // 檢查是否碰到任一未答對的字卡
    let found = false;
    for (let i = 0; i < cardPositions.length; i++) {
      if (answeredCards.includes(i)) continue; // 已答對的不再互動
      let card = cardPositions[i];
      if (
        pointer[0] > card.x &&
        pointer[0] < card.x + cardWidth &&
        pointer[1] > card.y &&
        pointer[1] < card.y + cardHeight
      ) {
        draggingCardIndex = i;
        // 記錄手指和字卡左上角的偏移
        dragOffset.x = pointer[0] - card.x;
        dragOffset.y = pointer[1] - card.y;
        found = true;
        break;
      }
    }
    // 若沒碰到任何卡片則釋放
    if (!found) draggingCardIndex = null;
  } else {
    draggingCardIndex = null;
  }

  // 拖曳字卡
  if (
    draggingCardIndex !== null &&
    pointer &&
    !answeredCards.includes(draggingCardIndex)
  ) {
    // 取得目前字卡位置
    let card = cardPositions[draggingCardIndex];
    // 目標位置
    let targetX = pointer[0] - cardWidth / 2;
    let targetY = pointer[1] - cardHeight / 2;
    // 用 lerp 讓字卡平滑移動到目標
    card.x = lerp(card.x, targetX, 0.35);
    card.y = lerp(card.y, targetY, 0.35);

    // 判斷是否移動到正確桶子（只要有碰到邊框就算）
    let cardName = cardNames[draggingCardIndex];
    let correctBarrel = correctMap[cardName];
    for (let i = 0; i < barrelNames.length; i++) {
      let barrelX = barrelStartX + i * (barrelWidth + barrelGap);
      // 判斷字卡與桶子是否有重疊
      let cardLeft = cardPositions[draggingCardIndex].x;
      let cardRight = cardLeft + cardWidth;
      let cardTop = cardPositions[draggingCardIndex].y;
      let cardBottom = cardTop + cardHeight;
      let barrelLeft = barrelX;
      let barrelRight = barrelX + barrelWidth;
      let barrelTop = barrelY;
      let barrelBottom = barrelY + barrelHeight;

      let isOverlap =
        cardLeft < barrelRight &&
        cardRight > barrelLeft &&
        cardTop < barrelBottom &&
        cardBottom > barrelTop;

      if (
        isOverlap &&
        barrelNames[i] === correctBarrel &&
        !showCorrect &&
        !answeredCards.includes(draggingCardIndex)
      ) {
        showCorrect = true;
        correctTimer = millis();
        score++; // 答對加一分
        answeredCards.push(draggingCardIndex); // 標記此卡已答對
        draggingCardIndex = null; // 放進桶子後就不能再拖曳
        break; // 避免重複判斷
      }
    }
  }

  // 畫出未被答對的字卡
  textAlign(CENTER, CENTER);
  textSize(20);
  for (let i = 0; i < cardNames.length; i++) {
    if (answeredCards.includes(i)) continue; // 已答對的不畫
    let card = cardPositions[i];
    stroke(0);
    strokeWeight(2);
    fill(0, 0, 0, 0); // 透明底
    rect(card.x, card.y, cardWidth, cardHeight, 8);
    noStroke();
    fill(255);
    text(cardNames[i], card.x + cardWidth / 2, card.y + cardHeight / 2);
  }

  textSize(18);
  for (let i = 0; i < barrelNames.length; i++) {
    let barrelX = barrelStartX + i * (barrelWidth + barrelGap);
    stroke(0);
    strokeWeight(2);
    fill(200);
    rect(barrelX, barrelY, barrelWidth, barrelHeight, 12);
    noStroke();
    fill(0);
    text(barrelNames[i], barrelX + barrelWidth / 2, barrelY + barrelHeight / 2);
  }

  // 在 draw() 最下方加上顯示訊息
  if (answeredCards.length === cardNames.length && !finished) {
    fill(0, 200, 255);
    textSize(36);
    textAlign(CENTER, CENTER);
    text("恭喜完成，後面還有喔！", width / 2, height / 2);
    if (finishShowTime === 0) finishShowTime = millis();
    if (millis() - finishShowTime > 2000) {
      finished = true;
      finalGameStarted = true;
    }
    return;
  }

  // --- 你的最後一個小遊戲 ---
  if (finalGameStarted && (!finalGameAnswered || showMsg !== "" || finalResultShowTime > 0 || showFirework)) {
    fill(255);
    textSize(28);
    textAlign(CENTER, CENTER);
    text("教科是全台第一所教科嗎？", width / 2, height / 2 - 60);

    // 畫兩個黑框
    let boxWidth = 100;
    let boxHeight = 60;
    let gap = 60;
    let yesX = width / 2 - boxWidth - gap / 2;
    let noX = width / 2 + gap / 2;
    let boxY = height / 2 + 20;

    // 是
    fill(0);
    stroke(255);
    strokeWeight(3);
    rect(yesX, boxY, boxWidth, boxHeight, 10);
    noStroke();
    fill(255);
    textSize(32);
    text("是", yesX + boxWidth / 2, boxY + boxHeight / 2);

    // 否
    fill(0);
    stroke(255);
    strokeWeight(3);
    rect(noX, boxY, boxWidth, boxHeight, 10);
    noStroke();
    fill(255);
    textSize(32);
    text("否", noX + boxWidth / 2, boxY + boxHeight / 2);

    // 判斷食指碰到哪個框，並顯示訊息2秒
    if (pointer && showMsg === "" && !finalGameAnswered) {
      if (
        pointer[0] > yesX &&
        pointer[0] < yesX + boxWidth &&
        pointer[1] > boxY &&
        pointer[1] < boxY + boxHeight
      ) {
        showMsg = "恭喜答對";
        finalMsgShowTime = millis();
        finalGameAnswered = true;
        finalGameResult = "yes";
      }
      if (
        pointer[0] > noX &&
        pointer[0] < noX + boxWidth &&
        pointer[1] > boxY &&
        pointer[1] < boxY + boxHeight
      ) {
        showMsg = "答錯了！";
        finalMsgShowTime = millis();
        finalGameAnswered = true;
        finalGameResult = "no";
      }
    }
    // 顯示訊息2秒
    if (showMsg !== "") {
      fill(showMsg === "恭喜答對" ? "green" : "red");
      textSize(32);
      textAlign(CENTER, CENTER);
      text(showMsg, width / 2, boxY - 50);
      if (millis() - finalMsgShowTime > 2000) {
        // 2秒後顯示最終訊息
        if (finalResultShowTime === 0) {
          finalResultShowTime = millis();
          if (finalGameResult === "yes") {
            finalResultMsg = "你怎麼這個也知道！";
            showFirework = true;
            fireworkStartTime = millis();
            fireworks = [];
            // 產生多組火砲
            for (let i = 0; i < 8; i++) {
              let fx = width / 2 + random(-80, 80);
              let fy = height / 2 + random(-60, 60);
              let color = [random(180,255), random(100,255), random(100,255)];
              for (let j = 0; j < 30; j++) {
                fireworks.push(new FireworkParticle(fx, fy, color));
              }
            }
          } else {
            finalResultMsg = "你該去看一下教科網站了！";
            showFirework = false;
          }
        }
        showMsg = ""; // 清空訊息，進入五秒訊息階段
      } else {
        return; // 2秒內只顯示訊息，不進入最終答案畫面
      }
    }
    // 顯示最終訊息5秒
    if (finalResultShowTime > 0) {
      // 火砲特效（只有答對才有）
      if (showFirework && millis() - finalResultShowTime < 5000) {
        for (let i = fireworks.length - 1; i >= 0; i--) {
          fireworks[i].update();
          fireworks[i].show();
          if (fireworks[i].isDead()) {
            fireworks.splice(i, 1);
          }
        }
      }
      fill(0, 200, 255);
      textSize(36);
      textAlign(CENTER, CENTER);
      text(finalResultMsg, width / 2, height / 2);

      // 5秒後不顯示任何內容，畫面只剩下視訊
      if (millis() - finalResultShowTime > 5000) {
        showFirework = false;
        showSecondQuestion = true; // 進入第二題
        ;
      }
    }
    ;
  }

  // --- 第二題 ---
  if (showSecondQuestion) {
    // 若已進入感謝畫面，直接顯示感謝與重新遊玩鈕
    if (showThanks) {
      background('#f2e8cf');
      fill(255, 180, 0);
      textSize(40);
      textAlign(CENTER, CENTER);
      text("感謝遊玩！", width / 2, height / 2 - 40);

      // 重新遊玩按鈕
      let boxW = 180;
      let boxH = 60;
      let boxX = width / 2 - boxW / 2;
      let boxY = height / 2 + 20;
      fill(0);
      stroke(255, 180, 0);
      strokeWeight(4);
      rect(boxX, boxY, boxW, boxH, 12);
      noStroke();
      fill(255, 180, 0);
      textSize(28);
      text("重新遊玩", width / 2, boxY + boxH / 2);

      // pointer 計算
      let pointer2 = null;
      if (predictions.length > 0 && predictions[0].landmarks && predictions[0].landmarks[8]) {
        let indexTip = predictions[0].landmarks[8];
        let mirroredX = width - (indexTip[0]);
        let mirroredY = indexTip[1];
        pointer2 = [
          mirroredX - (width - video.width) / 2,
          mirroredY - (height - video.height) / 2
        ];
      }

      // 偵測食指碰到重新遊玩按鈕
      if (
        pointer2 &&
        pointer2[0] > boxX &&
        pointer2[0] < boxX + boxW &&
        pointer2[1] > boxY &&
        pointer2[1] < boxY + boxH
      ) {
        // 重設所有遊戲狀態
        showCorrect = false;
        correctTimer = 0;
        welcomeStage = 0;
        welcomeTimer = 0;
        score = 0;
        answeredCards = [];
        finishShowTime = 0;
        finished = false;
        finalGameStarted = false;
        finalGameAnswered = false;
        finalGameResult = "";
        finalMsgShowTime = 0;
        showMsg = "";
        finalResultShowTime = 0;
        finalResultMsg = "";
        showFirework = false;
        fireworkStartTime = 0;
        fireworks = [];
        draggingCardIndex = null;
        showSecondQuestion = false;
        secondAnswered = false;
        secondAnswer = "";
        secondMsg = "";
        secondMsgTime = 0;
        gameEnded = false;
        showThanks = false;
        // 重新初始化字卡位置
        let totalWidth = cardNames.length * cardWidth + (cardNames.length - 1) * cardGap;
        let x = (width - video.width) / 2;
        let y = (height - video.height) / 2;
        let startX = x + (video.width - totalWidth) / 2;
        let cardY = y + 20;
        cardPositions = [];
        for (let i = 0; i < cardNames.length; i++) {
          let cardX = startX + i * (cardWidth + cardGap);
          cardPositions.push({ x: cardX, y: cardY });
        }
        return;
      }
      return; // 只顯示感謝畫面與按鈕
    }

    // 還沒進入感謝畫面，顯示第二題
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("哪一間教室可以吃東西？", width / 2, height / 2 - 80);

    // 選項框參數
    let boxW = 100;
    let boxH = 60;
    let gap = 40;
    let totalW = boxW * 3 + gap * 2;
    let startX = width / 2 - totalW / 2;
    let boxY = height / 2 + 20;
    let options = ["102", "105", "110"];

    // pointer 計算
    let pointer = null;
    if (predictions.length > 0 && predictions[0].landmarks && predictions[0].landmarks[8]) {
      let indexTip = predictions[0].landmarks[8];
      let mirroredX = width - (indexTip[0]);
      let mirroredY = indexTip[1];
      pointer = [
        mirroredX - (width - video.width) / 2,
        mirroredY - (height - video.height) / 2
      ];
      fill(255, 0, 0);
      noStroke();
      ellipse(pointer[0], pointer[1], 18);
    }

    // 選項框
    for (let i = 0; i < 3; i++) {
      let bx = startX + i * (boxW + gap);
      fill(0);
      stroke(255, 180, 0);
      strokeWeight(3);
      rect(bx, boxY, boxW, boxH, 12);
      noStroke();
      fill(255, 180, 0);
      textSize(28);
      text(options[i], bx + boxW / 2, boxY + boxH / 2);

      // 判斷食指是否選到
      if (
        !secondAnswered &&
        pointer &&
        pointer[0] > bx &&
        pointer[0] < bx + boxW &&
        pointer[1] > boxY &&
        pointer[1] < boxY + boxH
      ) {
        secondAnswered = true;
        secondAnswer = options[i];
        if (secondAnswer === "105") {
          secondMsg = "答對了";
        } else {
          secondMsg = "答錯了";
        }
        secondMsgTime = millis();
      }
    }

    // 顯示答題結果5秒，之後顯示感謝畫面
    if (secondAnswered) {
      fill(secondAnswer === "105" ? "green" : "red");
      textSize(36);
      textAlign(CENTER, CENTER);
      text(secondMsg, width / 2, height / 2);
      if (millis() - secondMsgTime > 5000) {
        showThanks = true;
      }
    }
    return; // 這行很重要！只顯示第二題或感謝畫面，其餘不顯示
  }

  // 顯示第二題答題結果2秒
  if (showSecondQuestion && secondAnswered) {
    fill(secondAnswer === "105" ? "green" : "red");
    textSize(36);
    textAlign(CENTER, CENTER);
    text(secondMsg, width / 2, height / 2);
    // 2秒後可進入下一階段或結束
    if (millis() - secondMsgTime > 2000) {
      // 這裡可以決定進入哪個階段或結束遊戲
      noLoop(); // 停止 draw() 循環
      setTimeout(() => {
        // 3秒後自動重新整理頁面
        location.reload();
      }, 3000);
    }
    return;
  }

  // 原本的「恭喜答對!」訊息
  if (showCorrect) {
    fill(255, 255, 0);
    textSize(36);
    textAlign(CENTER, CENTER);
    text("恭喜答對!", width / 2, height / 2);
    if (millis() - correctTimer > 2000) {
      showCorrect = false;
    }
  }

  if (gameEnded) {
    fill(255, 180, 0);
    textSize(40);
    textAlign(CENTER, CENTER);
    text("遊戲結束，感謝遊玩！", width / 2, height / 2);
    return;
  }

  // 在 draw() 最後面加上這段，確保無論流程如何都會顯示「感謝遊玩！」（例如遊戲結束時）
  if (gameEnded || showThanks) {
    background('#f2e8cf');
    fill(255, 180, 0);
    textSize(40);
    textAlign(CENTER, CENTER);
    text("感謝遊玩！", width / 2, height / 2);
    return;
  }
}

// Callback function for when handPose outputs data
function gotHands(results) {
  // save the output to the hands variable
  predictions = results;
}

let lastPointer = null;
function smoothPointer(newPointer, alpha = 0.5) {
  if (!lastPointer) {
    lastPointer = [newPointer[0], newPointer[1]];
  } else {
    lastPointer[0] = lerp(lastPointer[0], newPointer[0], alpha);
    lastPointer[1] = lerp(lastPointer[1], newPointer[1], alpha);
  }
  return lastPointer;
}

let showSecondQuestion = false;
let secondAnswered = false;
let secondAnswer = "";
let secondMsg = "";
let secondMsgTime = 0;
let gameEnded = false;
let showThanks = false; // 新增：顯示感謝畫面
let dragOffset = { x: 0, y: 0 };

function mousePressed() {
  // 計算視訊畫面的位置與範圍
  let x = (width - video.width) / 2;
  let y = (height - video.height) / 2;
  // 檢查滑鼠是否在視訊畫面範圍內
  if (
    mouseX > x && mouseX < x + video.width &&
    mouseY > y && mouseY < y + video.height
  ) {
  }
}
