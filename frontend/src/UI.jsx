import { useState } from "react";
import Video from "./functions/Video";

export default function UI(){

  function start() {
    window.startSession();
  }

  function stop() {
    window.stopSession();
  }

  return(
    <>
      <button onClick={start}>START</button>
      <button onClick={stop}>STOP</button>
    </>
  )
}