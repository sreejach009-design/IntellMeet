import React from 'react';
import VideoTile from './VideoTile';

const VideoGrid = ({
  localStream,
  currentUser,
  remoteStreams = [],
  isAudioMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  hostUserId = null,
}) => {
  const totalParticipants = 1 + remoteStreams.length;

  // Grid layout class based on count
  const getGridClasses = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  };

  return (
    <div className={`grid ${getGridClasses()} gap-3.5 w-full h-full p-2 auto-rows-fr`}>
      {/* Local participant video tile */}
      <VideoTile
        stream={localStream}
        user={currentUser}
        isSelf={true}
        audioEnabled={!isAudioMuted}
        videoEnabled={!isVideoOff}
        isScreenSharing={isScreenSharing}
        isHost={currentUser?.id === hostUserId || currentUser?._id === hostUserId}
      />

      {/* Remote participants video tiles */}
      {remoteStreams.map((remote) => (
        <VideoTile
          key={remote.socketId}
          stream={remote.stream}
          user={remote.user}
          isSelf={false}
          audioEnabled={remote.audioEnabled}
          videoEnabled={remote.videoEnabled}
          isScreenSharing={remote.isScreenSharing}
          isHost={remote.user?.id === hostUserId || remote.user?._id === hostUserId}
        />
      ))}
    </div>
  );
};

export default VideoGrid;
