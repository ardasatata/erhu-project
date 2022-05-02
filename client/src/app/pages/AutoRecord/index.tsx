/**
 *
 * RecordVideo
 *
 */
import * as React from 'react';
import styled from 'styled-components/macro';
import { StyleConstants } from '../../../styles/StyleConstants';
import { PageWrapper } from '../../components/PageWrapper';
import { Helmet } from 'react-helmet-async';

import { useEffect, useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { NavBar } from '../../components/NavBar';
import Webcam from 'react-webcam';
import { io } from 'socket.io-client';

import { useAlert } from 'react-alert';
import axios from 'axios';
import { ReactComponent as KneeIcon } from '../PlayVideo/assets/knee.svg';
import { ReactComponent as BowIcon } from '../PlayVideo/assets/bow.svg';
import { ReactComponent as TorsoIcon } from '../PlayVideo/assets/torso.svg';

interface Props {}

const FPS = 1;
// const COUNTER_LIMIT = 2;

export function AutoRecord(props: Props) {
  const webcamRef = React.useRef(null);
  const mediaRecorderRef = React.useRef(null);
  const [capturing, setCapturing] = React.useState(false);
  const [recordedChunks, setRecordedChunks] = React.useState([]);

  const [socket, setSocket] = useState<any>(null);
  const [webcamFrame, setWebcamFrame] = useState<any>(null);

  const [img, setImg] = useState<string>('');
  const [data, setData] = useState<any>({
    ok: false,
    message: '',
  });

  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  const [isFrameOk, setIsFrameOk] = useState<boolean>(false);

  const alert = useAlert();

  const [isLoading, setIsloading] = useState(true);
  const [isRefreshLoading, setIsRefreshLoading] = useState(false);

  // const [recordCounter, setRecordCounter] = useState<number>(0);
  //
  // const incrementCounter = () => {
  //   setRecordCounter(recordCounter + 1);
  // };
  //
  // const resetCounter = () => {
  //   setRecordCounter(0);
  // };

  const handleStartCaptureClick = React.useCallback(() => {
    setCapturing(true);
    // @ts-ignore
    mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
      mimeType: 'video/webm',
    });
    // @ts-ignore
    mediaRecorderRef.current.addEventListener(
      'dataavailable',
      handleDataAvailable,
    );
    // @ts-ignore
    mediaRecorderRef.current.start();

    alert.info('Recording Start ▶️');
  }, [webcamRef, setCapturing, mediaRecorderRef]);

  const handleDataAvailable = React.useCallback(
    ({ data }) => {
      if (data.size > 0) {
        setRecordedChunks(prev => prev.concat(data));
      }
    },
    [setRecordedChunks],
  );

  const handleStopCaptureClick = React.useCallback(() => {
    // @ts-ignore
    mediaRecorderRef.current.stop();
    setCapturing(false);
    alert.info('Recording Stop 🛑');
  }, [mediaRecorderRef, webcamRef, setCapturing]);

  const handleDownload = React.useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      // @ts-ignore
      a.style = 'display: none';
      a.href = url;
      a.download = 'react-webcam-stream-capture.webm';
      a.click();
      window.URL.revokeObjectURL(url);
      setRecordedChunks([]);
    }
  }, [recordedChunks]);

  const capture = React.useCallback(() => {
    // @ts-ignore
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      // console.log(imageSrc);
    }
    setWebcamFrame(imageSrc);
    // socket.emit('webcam-stream', imageSrc);
  }, [webcamRef, socket]);

  useEffect(() => {
    setInterval(() => {
      capture();
    }, 1000 / FPS);
  }, []);

  useEffect(() => {
    setInterval(() => {
      setIsloading(false);
    }, 3000);
  });

  useEffect(() => {
    if (!isLoading) {
      if (isFrameOk) {
        alert.success('Position OK! ✅');
      } else {
        alert.error('Check your pose! ☝🏻 ');
      }
    }
  }, [
    alert,
    handleStartCaptureClick,
    handleStopCaptureClick,
    isFrameOk,
    isLoading,
  ]);

  const uploadFile = async (blob, filename) => {
    const headers = {
      'Content-Type': 'multipart/form-data',
      'Access-Control-Allow-Origin': '*',
    };

    const formData = new FormData();
    // @ts-ignore
    formData.append('video', blob, `${filename}.mp4`);

    const result = await axios.post(
      'https://140.115.51.243/api/send-video',
      formData,
      { headers },
    );

    console.log(result);

    if (result.data.ok) {
      alert.success(`File Uploaded Successfully as ${result.data.filename}`);
    } else {
      alert.error('Error Occurred');
    }
  };

  // @ts-ignore
  useEffect(() => {
    const newSocket = io(`https://140.115.51.243:5000/stream-checking`, {
      transports: ['websocket'],
      upgrade: false,
      secure: true,
    });
    // @ts-ignore
    newSocket.connect();
    setSocket(newSocket);

    newSocket.on('image', data => {
      const obj = JSON.parse(data);
      // setFrame(obj.frame);
      setData(obj.data);
      setImg('data:image/jpeg;base64,' + obj.image);

      if (obj.data.ok) {
        setIsFrameOk(true);
        // incrementCounter();
        if (!capturing) {
          handleStartCaptureClick();
        }
      } else {
        setIsFrameOk(false);
        if (capturing) {
          handleStopCaptureClick();
        }
      }

      console.log(obj);
    });

    return () => newSocket.close();
  }, [capturing, handleStartCaptureClick, handleStopCaptureClick, setSocket]);

  function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const reset = async () => {
    window.location.reload();
  };

  useEffect(() => {
    if (recordedChunks.length > 0) {
      setIsRefreshLoading(true);
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      console.log(blob);
      if (!isRefreshLoading) {
        uploadFile(blob, '').then(r => {
          timeout(5000).then(() => reset());
        });
      }
    }
  }, [recordedChunks, uploadFile, isRefreshLoading]);

  useEffect(() => {
    if (webcamFrame) {
      socket.emit('webcam-stream', webcamFrame);
      // console.log(webcamFrame);
      // console.log(socket);
    }
  }, [socket, setSocket, webcamFrame]);

  const toggleOriginal = () => {
    setShowOriginal(!showOriginal);
    alert.success("It's ok now!");
  };

  // @ts-ignore
  return (
    <>
      <Helmet>
        <title>Auto Record</title>
        <meta name="description" content="Auto record tool" />
      </Helmet>
      <NavBar />
      <PageWrapperMain className={'bg-black'}>
        <div
          className={'pl-8 pt-4 absolute z-10 pr-4 pb-4'}
          style={{ backgroundColor: 'rgba(0,47,105,0.50)' }}
        >
          {capturing ? (
            <div className={'flex flex-row'}>
              <div
                className={'bg-red-500 h-8 w-8 rounded-full animate-pulse mr-4'}
              />
              <h1 className={'text-white text-3xl'}>Recording...</h1>
            </div>
          ) : (
            <div className={'flex flex-col'}>
              <h1 className={'text-white text-3xl'}>
                Please check below position :
              </h1>
              <h1 className={'text-white text-3xl'}>
                {data.errors ? (
                  <div className={'flex flex-col pt-2 text-xl text-bold'}>
                    <div
                      className={
                        data.errors[0]
                          ? 'flex items-center mb-2 text-green-300'
                          : 'flex items-center text-red-500 mb-2'
                      }
                    >
                      <KneeIcon className={'w-12 h-12 mr-4'} />
                      <div className={'whitespace-nowrap'}>{`兩膝`}</div>
                    </div>
                    <div
                      className={
                        data.errors[1]
                          ? 'flex items-center mb-2 text-green-300'
                          : 'flex items-center text-red-500 mb-2'
                      }
                    >
                      <BowIcon className={'w-12 h-12 mr-4'} />
                      <div className={'whitespace-nowrap'}>{`上的二胡`}</div>
                    </div>
                    <div
                      className={
                        data.errors[2]
                          ? 'flex items-center mb-2 text-green-300'
                          : 'flex items-center text-red-500 mb-2'
                      }
                    >
                      <TorsoIcon className={'w-12 mr-4'} />
                      <div className={'whitespace-nowrap'}>{`身體`}</div>
                    </div>
                  </div>
                ) : null}
              </h1>
            </div>
          )}
        </div>

        {isLoading || isRefreshLoading ? (
          <div
            className={
              'flex flex-col text-white text-7xl m-auto items-center justify-center bg-black'
            }
          >
            <LoadingOutlined className={'mb-12'} />
            {isRefreshLoading ? (
              <div className={'text-7xl'}>
                Please wait... ⌛, we're processing your video 🔨
              </div>
            ) : (
              <div className={'text-7xl'}>Please wait... ⌛</div>
            )}
          </div>
        ) : (
          <div className={'flex h-full w-full bg-black'}>
            <div
              className={
                'flex flex-col items-center z-10 mx-auto absolute right-0 bottom-0 pb-4 pr-8'
              }
              style={{
                maxWidth: 480,
              }}
            >
              {/*<div className={'flex flex-col'}>*/}
              {/*  {capturing ? (*/}
              {/*    <button onClick={handleStopCaptureClick}>Stop Capture</button>*/}
              {/*  ) : (*/}
              {/*    <button onClick={handleStartCaptureClick}>*/}
              {/*      Start Capture*/}
              {/*    </button>*/}
              {/*  )}*/}
              {/*  /!*{recordedChunks.length > 0 && (*!/*/}
              {/*  /!*  <button onClick={handleDownload}>Download</button>*!/*/}
              {/*  /!*)}*!/*/}
              {/*</div>*/}

              <h1
                className={
                  data.ok
                    ? 'text-3xl mb-2 text-green-200'
                    : 'text-3xl mb-2 text-red-500'
                }
              >
                {data.message}
              </h1>
              {data ? (
                <img
                  src={img}
                  alt={'main-stream'}
                  className={
                    data.ok
                      ? 'object-contain border-4 border-green-500'
                      : 'object-contain border-4 border-red-500'
                  }
                />
              ) : (
                <></>
              )}
              <p className={'mt-2 text-white font-black bg-gray-700 px-1'}>
                Pose Checker 🔍
              </p>
            </div>

            <div
              className={
                'flex flex-col items-center justify-center text-white w-full'
              }
            >
              <div className={'flex flex-row max-w-7xl w-full'}></div>

              <div
                className={
                  showOriginal
                    ? 'flex flex-col items-center'
                    : 'flex flex-col items-center absolute flex-0 mx-auto bg-black'
                }
              >
                {/*@ts-ignore*/}
                <Webcam
                  // @ts-ignore
                  audio={false}
                  // @ts-ignore
                  ref={webcamRef}
                  mirrored={true}
                  hidden={false}
                  height={1920}
                  width={1080}
                />
              </div>
            </div>
          </div>
        )}
      </PageWrapperMain>
    </>
  );
}

const Wrapper = styled.header`
  box-shadow: 0 1px 0 0 ${p => p.theme.borderLight};
  height: ${StyleConstants.NAV_BAR_HEIGHT};
  display: flex;
  position: fixed;
  top: 0;
  width: 100%;
  background-color: ${p => p.theme.background};
  z-index: 2;

  @supports (backdrop-filter: blur(10px)) {
    backdrop-filter: blur(10px);
    background-color: ${p =>
      p.theme.background.replace(
        /rgba?(\(\s*\d+\s*,\s*\d+\s*,\s*\d+)(?:\s*,.+?)?\)/,
        'rgba$1,0.75)',
      )};
  }

  ${PageWrapper} {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`;

export const PageWrapperMain = styled.div`
  display: flex;
  margin: 0 auto;
  box-sizing: content-box;
  height: calc(100vh - ${StyleConstants.NAV_BAR_HEIGHT});
`;
