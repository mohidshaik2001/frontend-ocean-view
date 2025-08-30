import React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Container from "../components/containers/Container.jsx";
import Logo from "../components/Logo.jsx";
import webrtcService from "../api/webrtcService.js";
import { minimizeCall, restoreCall } from "../store/callSlice.js";
import { Rnd } from "react-rnd";
import { set } from "react-hook-form";

function Home() {
  const status = useSelector((state) => state.auth.status);
  const callActive = useSelector((state) => state.call.callActive);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const localVideoRef = React.useRef(null);
  const remoteVideoRef = React.useRef(null);
  const isDragging = React.useRef(false);

  useEffect(() => {
    if (status && callActive) {
      (async () => {
        const { localStream, remoteStream } = await webrtcService.getStreams();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      })();
      dispatch(minimizeCall());
    }
  }, []);

  if (!status) {
    return (
      <Container className="h-full">
        <div className="grid grid-rows-4 w-full h-full rounded-3xl">
          <h1 className="text-5xl row-span-1 text-center p-10">
            HI there, welcome to our site
          </h1>
          <div className="row-span-3 flex flex-row justify-center items-center w-full h-full">
            <Logo className="h-100 w-100" />
          </div>
        </div>
      </Container>
    );
  }

  if (status && callActive) {
    // Calculate initial position for the Rnd component at bottom-right.
    // Adjust these values based on your layout/margins.
    const initialWidth = 450;
    const initialHeight = 280;
    const marginRight = 180;
    const marginBottom = 170;
    const initialX =
      window.innerWidth - initialWidth - marginRight > 0
        ? window.innerWidth - initialWidth - marginRight
        : 0;
    const initialY =
      window.innerHeight - initialHeight - marginBottom > 0
        ? window.innerHeight - initialHeight - marginBottom
        : 0;

    const handleClickNavigation = () => {
      dispatch(restoreCall());
      navigate("/videocall");
    };

    return (
      <Container className="h-full">
        <div className="grid grid-cols-2 w-full h-full rounded-3xl">
          <div className="w-full h-full justify-center align-center border-2 border-amber-500">
            <h1 className="text-5xl text-center p-10">
              seems like you are in a call
            </h1>
            <div className="flex flex-row justify-center items-center">
              <Logo className="h-100 w-100" />
            </div>
          </div>
          <Rnd
            default={{
              x: initialX,
              y: initialY,
              width: initialWidth,
              height: initialHeight,
            }}
            minWidth={320}
            minHeight={240}
            bounds="window"
            onDragStart={(e, d) => {
              isDragging.current = false;
            }}
            onDrag={(e, d) => {
              isDragging.current = true;
            }}
            onDragStop={(e, d) => {
              console.log("Drag stopped at: ", d);
              // Trigger navigation on drag-stop if desired.
              // You can remove this if you only want navigation on click.
              setTimeout(() => {
                isDragging.current = false;
              }, 100);
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              console.log(
                "Resize stopped. New size: ",
                ref.style.width,
                ref.style.height
              );
            }}
          >
            <div
              onClick={() => {
                if (!isDragging.current) {
                  handleClickNavigation();
                }
              }}
              className="relative bg-black w-full h-full justify-end items-end cursor-pointer rounded-2xl"
            >
              <video
                ref={localVideoRef}
                className="absolute bottom-4 right-4 h-1/3 w-1/3 rounded-lg border-2 border-white object-cover z-50 hover:border-green-400"
                autoPlay
                playsInline
              />
              <video
                ref={remoteVideoRef}
                className="w-full h-full object-cover rounded-lg"
                autoPlay
                playsInline
              />
            </div>
          </Rnd>
        </div>
      </Container>
    );
  }

  return (
    <Container className="h-full">
      <div className="grid grid-rows-4 w-full h-full rounded-3xl p-10">
        <div className=" row-span-1 grid grid-cols-3 grid-rows-3 items-center bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-[40px] h-3/4 w-8/10 p-5 space-x-5">
          <h1 className="text-5xl row-start-1 col-start-1 text-center  text-white">
            Connect..
          </h1>
          <h1 className="text-5xl row-start-2 col-start-2 text-center  text-white ">
            Communicate..
          </h1>
          <h1 className="text-5xl row-start-3 col-start-3 text-center  text-white ">
            Collabrate..
          </h1>
        </div>
        {/* <h1 className="text-5xl row-span-1 text-center p-10 text-gray-500">
          Connect..Communicate..Collabrate..
        </h1> */}
        <div className="row-span-3  flex flex-row justify-center items-center w-full h-full">
          <Logo className="h-100 w-100" />
          {/* <div className="absolute left-2/10 h-1/2 w-1/2  border-2 border-b-current rounded-[10%] backdrop-blur-[5px] shadow-2xl"></div> */}
          {/* <div className="absolute left-2/10 h-1/2 w-1/2 backdrop-blur-md border border-white/20 rounded-[50px] shadow-lg opacity-90"></div> */}
        </div>
      </div>
    </Container>
  );
}

export default Home;
