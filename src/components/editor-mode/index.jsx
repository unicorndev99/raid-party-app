import React from 'react';

import {AiMenu} from './ai-menu';
import {SceneMenu} from './scene-menu';
import {Inspector} from './inspector';
import {UIMode} from '../general/ui-mode';

//

export const EditorMode = ({
  selectedScene,
  setSelectedScene,
  selectedRoom,
  setSelectedRoom,
}) => {
  const multiplayerConnected = !!selectedRoom;

  //

  return (
    <div>
      <UIMode hideDirection="top">
        <SceneMenu
          multiplayerConnected={multiplayerConnected}
          selectedScene={selectedScene}
          setSelectedScene={setSelectedScene}
          selectedRoom={selectedRoom}
          setSelectedRoom={setSelectedRoom}
        />
      </UIMode>
      <AiMenu />
      <Inspector />
    </div>
  );
};
