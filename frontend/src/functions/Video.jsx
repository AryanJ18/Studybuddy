import { useRef, useEffect, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateEAR } from "./Ear";
import { detectAttention } from "./Head";

export default function Video(){

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [events, setEvents] = useState([]);
  const isEyesClosedRef = useRef(false);
  const startTimeRef = useRef(null);

  async function init(){
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");

    const faceLandmarker = await FaceLandmarker.createFromOptions(vision,
    {
      baseOptions: {
        modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
      },
      runningMode: "VIDEO"
    });

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const result = faceLandmarker.detectForVideo(video,performance.now());
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (result.faceLandmarks.length > 0) {
          const landmarks = result.faceLandmarks[0];

          const leftEyeIndices = [33, 160, 158, 133, 153, 144];
          const leftEye = leftEyeIndices.map(i => landmarks[i]);
          const ear = calculateEAR(leftEye);

          console.log(detectAttention(landmarks));
          handleEAR(ear);

          landmarks.forEach((point) => {
            ctx.beginPath();
            ctx.arc(
              point.x * canvas.width,
              point.y * canvas.height,
              2,
              0,
              2 * Math.PI);
            ctx.fill();
          });
        }
      }
      requestAnimationFrame(loop);
    }
    loop();
  }
  

  async function setUpCamera(){
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    return new Promise((resolve) => {
      videoRef.current.srcObject = stream;

      videoRef.current.onloadeddata = () => {
        resolve();
      };
    });
  }

  useEffect(()=>{
    async function start() {
      await setUpCamera();
      await init();
    }
    start();
  },[])

  function handleEAR(ear) {
    const now = Date.now();

    // CASE 1: eyes closed → start event
    if (ear < 0.2) {
      if (!isEyesClosedRef.current) {
        isEyesClosedRef.current = true;
        startTimeRef.current = now;
      }
    } 
    // CASE 2: eyes open → end event
    else {
      if (isEyesClosedRef.current) {
        const duration = now - startTimeRef.current;

        if (duration > 500) {
          const event = {
            type: "eyes_closed",
            startTime: startTimeRef.current,
            endTime: now,
            duration: duration
          };

          setEvents(prev => [...prev, event]);
          console.log("Event logged:", event);
        }

        isEyesClosedRef.current = false;
        startTimeRef.current = null;
      }
    }
  }
  
  return (
      <div style={{ position: "relative" }}><video ref={videoRef} autoPlay playsInline style={{ position: "absolute" }}/>
      <canvas ref={canvasRef} style={{ position: "absolute" }}/>
      </div>
    );
}