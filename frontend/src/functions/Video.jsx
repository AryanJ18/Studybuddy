import { useRef, useEffect } from "react"

export default function Video(){

  const videoRef = useRef(null);

  async function setUpCamera(){
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  }

  useEffect(()=>{
    setUpCamera();
  },[])

  
  return(<>
  <video ref={videoRef} autoPlay playsInline ></video>
  </>)
}