import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
} from 'react';
import {QueryClientProvider, QueryClient} from '@tanstack/react-query';
import {ReactQueryDevtools} from '@tanstack/react-query-devtools';

import classnames from 'classnames';

import game from '../../../game';
import sceneNames from '../../../scenes/scenes.json';
import {parseQuery} from '../../../util.js';
import Webaverse from '../../../webaverse.js';
import universe from '../../../universe.js';
import cameraManager from '../../../camera-manager';
import {world} from '../../../world';

import {ActionMenu} from '../general/action-menu';
import {Crosshair} from '../general/crosshair';
import {Settings} from '../general/settings';
import {WorldObjectsList} from '../general/world-objects-list';
import {
  IoHandler,
  registerIoEventHandler,
  unregisterIoEventHandler,
} from '../general/io-handler';
import {ZoneTitleCard} from '../general/zone-title-card';
import {Quests} from '../play-mode/quests';
import {MapGen} from '../general/map-gen/MapGen.jsx';
import {UIMode} from '../general/ui-mode';
import {LoadingBox} from '../../LoadingBox.jsx';
import {FocusBar} from '../../FocusBar.jsx';
import {DragAndDrop} from '../../DragAndDrop.jsx';
import {Stats} from '../../Stats.jsx';
import {PlayMode} from '../play-mode';
import {EditorMode} from '../editor-mode';
import Header from '../../Header.jsx';
import QuickMenu from '../../QuickMenu.jsx';
import {ClaimsNotification} from '../../ClaimsNotification.jsx';
import {DomRenderer} from '../../DomRenderer.jsx';
import {BuildVersion} from '../general/build-version/BuildVersion.jsx';
import {handleStoryKeyControls} from '../../../story';
import {GrabKeyIndicators} from '../../GrabKeyIndicators';

import styles from './App.module.css';
import '../../fonts.css';
import raycastManager from '../../../raycast-manager';
import npcManager from '../../../npc-manager';

import {AccountContext} from '../../hooks/web3AccountProvider';
import {ChainContext} from '../../hooks/chainProvider';
import loadoutManager from '../../../loadout-manager';
import Modals from '../modals';
import {partyManager} from '../../../party-manager';
import SpriteGenerator from '../../pages/SpriteGenerator';

const _startApp = async (weba, canvas) => {
  weba.setContentLoaded();
  weba.bindInput();
  weba.bindInterface();
  weba.bindCanvas(canvas);

  await weba.waitForLoad();

  await npcManager.initDefaultPlayer();
  loadoutManager.initDefault();
  await universe.handleUrlUpdate();
  partyManager.inviteDefaultPlayer();

  await weba.startLoop();
};

const _getCurrentSceneSrc = () => {
  const q = parseQuery(window.location.search);
  let {src} = q;

  if (src === undefined) {
    src = './scenes/' + sceneNames[0];
  }

  return src;
};

const _getCurrentRoom = () => {
  const q = parseQuery(window.location.search);
  const {room} = q;
  return room || '';
};

const AppContext = createContext();

const queryClient = new QueryClient();

const useWebaverseApp = (() => {
  let webaverse = null;
  return () => {
    if (webaverse === null) {
      webaverse = new Webaverse();
    }
    return webaverse;
  };
})();

const Canvas = ({app}) => {
  const canvasRef = useRef(null);
  const [domHover, setDomHover] = useState(null);

  const isStarted = useRef(false);

  useEffect(() => {
    if (canvasRef.current) {
      if (!isStarted.current) {
        _startApp(app, canvasRef.current);
        isStarted.current = true;
      }
    }
  }, [app, canvasRef]);

  useEffect(() => {
    const domhoverchange = e => {
      const {domHover} = e.data;
      // console.log('dom hover change', domHover);
      setDomHover(domHover);
    };
    raycastManager.addEventListener('domhoverchange', domhoverchange);

    return () => {
      raycastManager.removeEventListener('domhoverchange', domhoverchange);
    };
  }, []);

  return (
    <canvas
      className={classnames(styles.canvas, domHover ? styles.domHover : null)}
      ref={canvasRef}
    />
  );
};

const App = () => {
  const [state, setState] = useState({openedPanel: null});
  const [uiMode, setUIMode] = useState('normal');
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const app = useWebaverseApp();
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedScene, setSelectedScene] = useState(_getCurrentSceneSrc());
  const [selectedRoom, setSelectedRoom] = useState(_getCurrentRoom());
  const [apps, setApps] = useState(world.appManager.getApps().slice());
  const account = useContext(AccountContext);
  const chain = useContext(ChainContext);
  const [startGame, setStartGame] = useState(false);

  const selectApp = (app, physicsId, position) => {
    game.setMouseSelectedObject(app, physicsId, position);
  };

  const _loadUrlState = () => {
    const src = _getCurrentSceneSrc();
    setSelectedScene(src);

    const roomName = _getCurrentRoom();
    setSelectedRoom(roomName);
  };

  useEffect(() => {
    if (
      state.openedPanel &&
      state.openedPanel !== 'ChatPanel' &&
      cameraManager.pointerLockElement
    ) {
      cameraManager.exitPointerLock();
    }

    if (state.openedPanel) {
      setUIMode('normal');
    }
  }, [state.openedPanel]);

  useEffect(() => {
    const handleStoryKeyUp = event => {
      if (game.inputFocused()) return;
      handleStoryKeyControls(event);
    };

    registerIoEventHandler('keyup', handleStoryKeyUp);

    return () => {
      unregisterIoEventHandler('keyup', handleStoryKeyUp);
    };
  }, []);

  useEffect(() => {
    if (uiMode === 'none') {
      setState({openedPanel: null});
    }

    const handleKeyDown = event => {
      if (event.ctrlKey && event.code === 'KeyH') {
        setUIMode(uiMode === 'normal' ? 'none' : 'normal');
        return false;
      }

      return true;
    };
    game.setGrabUseMesh(uiMode);

    registerIoEventHandler('keydown', handleKeyDown);

    return () => {
      unregisterIoEventHandler('keydown', handleKeyDown);
    };
  }, [uiMode]);

  useEffect(() => {
    const handleClick = () => {
      const hoverObject = game.getMouseHoverObject();

      if (hoverObject) {
        const physicsId = game.getMouseHoverPhysicsId();
        const position = game.getMouseHoverPosition();
        selectApp(hoverObject, physicsId, position);
        return false;
      }

      return true;
    };

    registerIoEventHandler('click', handleClick);

    return () => {
      unregisterIoEventHandler('click', handleClick);
    };
  }, []);

  useEffect(() => {
    const update = e => {
      setApps(world.appManager.getApps().slice());
    };

    world.appManager.addEventListener('appadd', update);
    world.appManager.addEventListener('appremove', update);
  }, []);

  useEffect(() => {
    const pushstate = e => {
      _loadUrlState();
    };

    const popstate = e => {
      _loadUrlState();
      universe.handleUrlUpdate();
    };

    window.addEventListener('pushstate', pushstate);
    window.addEventListener('popstate', popstate);

    return () => {
      window.removeEventListener('pushstate', pushstate);
      window.removeEventListener('popstate', popstate);
    };
  }, []);

  useEffect(_loadUrlState, []);

  //

  const onDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDragStart = e => {
    // console.log('drag start', e);
  };
  const onDragEnd = e => {
    // console.log('drag end', e);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider
        value={{
          state,
          setState,
          app,
          setSelectedApp,
          selectedApp,
          uiMode,
          account,
          chain,
          selectedScene,
          setSelectedScene,
          selectedRoom,
          setSelectedRoom,
          avatarLoaded,
          setAvatarLoaded,
          startGame,
          setStartGame,
        }}
      >
        {startGame && (
          <div
            className={styles.App}
            id="app"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
          >
            <Modals />
            <Header setSelectedApp={setSelectedApp} selectedApp={selectedApp} />
            <DomRenderer />
            <Canvas app={app} />
            <Crosshair />
            <ClaimsNotification />
            <WorldObjectsList
              setSelectedApp={setSelectedApp}
              selectedApp={selectedApp}
            />
            <PlayMode />
            <EditorMode
              selectedScene={selectedScene}
              setSelectedScene={setSelectedScene}
              selectedRoom={selectedRoom}
              setSelectedRoom={setSelectedRoom}
            />
            <IoHandler />
            <QuickMenu />
            <ZoneTitleCard />
            <MapGen />
            <Quests />
            <LoadingBox />
            <FocusBar />
            <DragAndDrop />
            <GrabKeyIndicators />
            <Stats app={app} />
          </div>
        )}
        <SpriteGenerator />
      </AppContext.Provider>
    </QueryClientProvider>
  );
};

export {AppContext, App};
