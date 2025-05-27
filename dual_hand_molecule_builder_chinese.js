// 檔案名稱: dual_hand_molecule_builder_chinese_fixed.js

let video; // 視訊變數
let handPose; // handPose 模型變數
let hands = []; // 用於儲存偵測到的手部數據的陣列

// 類原子物件
let draggables = []; // 可拖動物件陣列
const draggableRadius = 25; // 可拖動物件的半徑
const pinchThreshold = 40; // 食指和拇指之間被視為捏合的距離閾值

// 手部顏色 (最多2隻手)
const handColors = [
    [255, 0, 0, 150], // 紅色代表 hands[0]
    [0, 0, 255, 150]  // 藍色代表 hands[1]
];

function preload() {
    // preload 通常用於載入外部資源，如圖片、聲音、模型檔案
    // ml5.handPose 模型載入通常是非同步的，放在 setup 中配合 callback (modelReady) 也是常見做法
}

function setup() {
    createCanvas(640, 480); // 創建畫布
    console.log("畫布已創建");

    video = createCapture(VIDEO, function() {
        console.log("攝影機影像開始擷取 (createCapture callback)");
        // 這個回呼函數在 p5.js 的 createCapture 中不是必需的，
        // 但如果它被觸發，表示影像擷取至少有嘗試開始。
    });
    video.size(width, height); // 設定視訊大小
    video.hide(); // 隱藏原始視訊元素
    console.log("攝影機設定完成，嘗試載入 HandPose 模型...");

    // 初始化 handPose
    // createCapture 中的 `flipped: true` (如果這樣設定，雖然您的範例是 { flipped: true } 在 video = createCapture 裡面)
    // 和 handPose 中的 flipHorizontal 設定需要協調以達到鏡像效果。
    // 如果 video 已經是 flipped: true, handPose 的 flipHorizontal: false 通常是正確的，
    // 這樣 handPose 處理的是已經鏡像的座標。
    handPose = ml5.handPose(video, { flipHorizontal: false }, modelReady);
    handPose.on('predict', gotHands); // 設定預測事件的回調函數

    // 創建一些可拖動的「原子」佔位符
    draggables.push({ x: 100, y: 100, color: color(255, 255, 0), draggedByHand: -1, label: 'A' });
    draggables.push({ x: 200, y: 100, color: color(0, 255, 255), draggedByHand: -1, label: 'B' });
    draggables.push({ x: 150, y: 200, color: color(255, 0, 255), draggedByHand: -1, label: 'C' });
    draggables.push({ x: 250, y: 200, color: color(128, 128, 0), draggedByHand: -1, label: 'D' });
    console.log("可拖動物件已創建");
}

function modelReady() {
    console.log('HandPose 模型準備就緒！');
    // 有時第一次 modelReady 後，handpose 會再重新載入一次或做其他初始化
    // 可以嘗試在這裡第一次呼叫 predict，雖然 'predict' 事件應該會自動開始
    // handPose.predict(video); // 根據 ml5 版本，可能不需要手動呼叫
}

function gotHands(results) {
    hands = results; // 更新偵測到的手部數據
    if (hands.length > 0) {
        // console.log("偵測到手部數量: ", hands.length); // 可取消註解以查看手部數量
    }
}

// ... (setup 和其他函數保持不變) ...

function draw() {
    // 1. 檢查 video 物件是否存在且其寬度大於 0 (表示元數據已載入)
    if (video && video.width > 0) {
        image(video, 0, 0, width, height); // 繪製視訊畫面
        // console.log("繪製視訊畫面", video.width, video.height); // 可取消註解來確認是否執行
    } else {
        background(100, 150, 200); // 畫一個提示背景
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(20);
        if (!video) {
            text("Video 物件不存在！", width / 2, height / 2 - 20);
        } else {
            text("等待攝影機畫面載入...", width / 2, height / 2 - 20);
            text(`(Video 寬度: ${video.width})`, width / 2, height / 2 + 20);
        }
        // 如果視訊未準備好，可以選擇在這裡 return，
        // 或者繼續執行後續邏輯 (但手部偵測可能也無法正常工作)
        // return; // 如果選擇在此返回，後續的手部偵測將不會執行直到視訊準備好
    }

    // 2. 後續的手部偵測和繪製邏輯
    // (這裡貼上您原本 draw() 函數中處理 hands 的那部分程式碼)
    for (let i = 0; i < hands.length; i++) {
        if (i >= 2) break;
        const hand = hands[i];
        const currentKeypoints = hand.annotations || hand.keypoints || hand.landmarks;

        if (currentKeypoints) {
            let indexTip, thumbTip;
            if (hand.annotations) {
                indexTip = hand.annotations.indexFinger[3];
                thumbTip = hand.annotations.thumb[3];
                if (Array.isArray(indexTip)) indexTip = { x: indexTip[0], y: indexTip[1], z: indexTip[2] };
                if (Array.isArray(thumbTip)) thumbTip = { x: thumbTip[0], y: thumbTip[1], z: thumbTip[2] };
            } else if (hand.keypoints) {
                indexTip = hand.keypoints[8];
                thumbTip = hand.keypoints[4];
            } else if (hand.landmarks) {
                indexTip = { x: hand.landmarks[8][0], y: hand.landmarks[8][1] };
                thumbTip = { x: hand.landmarks[4][0], y: hand.landmarks[4][1] };
            } else {
                continue;
            }

            if (!indexTip || !thumbTip || typeof indexTip.x === 'undefined' || typeof thumbTip.x === 'undefined') {
                continue;
            }

            const handColor = handColors[i % handColors.length];
            fill(handColor);
            noStroke();
            ellipse(indexTip.x, indexTip.y, 20);
            ellipse(thumbTip.x, thumbTip.y, 20);

            const distance = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
            let isPinching = distance < pinchThreshold;

            if (isPinching) {
                fill(handColor[0], handColor[1], handColor[2], 255);
                ellipse((indexTip.x + thumbTip.x) / 2, (indexTip.y + thumbTip.y) / 2, 30);
                for (let j = 0; j < draggables.length; j++) {
                    let draggable = draggables[j];
                    if (dist(indexTip.x, indexTip.y, draggable.x, draggable.y) < draggableRadius) {
                         if (draggable.draggedByHand === -1 || draggable.draggedByHand === i) {
                            draggable.draggedByHand = i;
                            draggable.x = indexTip.x;
                            draggable.y = indexTip.y;
                            break;
                         }
                    }
                }
            } else {
                for (let j = 0; j < draggables.length; j++) {
                    if (draggables[j].draggedByHand === i) {
                        draggables[j].draggedByHand = -1;
                    }
                }
            }
        }
    }

    for (let draggable of draggables) {
        if (draggable.draggedByHand !== -1) {
            stroke(handColors[draggable.draggedByHand % handColors.length]);
            strokeWeight(4);
        } else {
            noStroke();
        }
        fill(draggable.color);
        ellipse(draggable.x, draggable.y, draggableRadius * 2);
        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(draggableRadius);
        text(draggable.label, draggable.x, draggable.y);
    }
}
