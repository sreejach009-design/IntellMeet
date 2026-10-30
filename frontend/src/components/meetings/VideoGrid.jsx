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

  // Check if any participant is actively sharing their screen
  const remoteScreenPresenter = remoteStreams.find((r) => r.isScreenSharing);
  const hasActiveScreenShare = isScreenSharing || Boolean(remoteScreenPresenter);

  // If someone is sharing their screen, use Spotlight / Presentation layout
  if (hasActiveScreenShare) {
    const isLocalPresenter = isScreenSharing;
    const otherRemotes = remoteStreams.filter(
      (r) => r.socketId !== remoteScreenPresenter?.socketId
    );

    return (
      <div className="flex flex-col md:flex-row gap-3 w-full h-full p-2 overflow-hidden">
        {/* Spotlight Stage: The Screen Share Tile */}
        <div className="flex-1 h-full min-h-[340px] flex items-center justify-center">
          {isLocalPresenter ? (
            <VideoTile
              stream={localStream}
              user={currentUser}
              isSelf={true}
              audioEnabled={!isAudioMuted}
              videoEnabled={!isVideoOff}
              isScreenSharing={true}
              isHost={currentUser?.id === hostUserId || currentUser?._id === hostUserId}
            />
          ) : (
            <VideoTile
              key={remoteScreenPresenter.socketId}
              stream={remoteScreenPresenter.stream}
              user={remoteScreenPresenter.user}
              isSelf={false}
              audioEnabled={remoteScreenPresenter.audioEnabled}
              videoEnabled={remoteScreenPresenter.videoEnabled}
              isScreenSharing={true}
              isHost={
                remoteScreenPresenter.user?.id === hostUserId ||
                remoteScreenPresenter.user?._id === hostUserId
              }
            />
          )}
        </div>

        {/* Participant Gallery Strip */}
        <div className="w-full md:w-64 h-36 md:h-full flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto shrink-0 pb-1 md:pb-0">
          {/* Show local tile in strip if remote is presenting */}
          {!isLocalPresenter && (
            <div className="w-48 md:w-full h-32 md:h-44 shrink-0">
              <VideoTile
                stream={localStream}
                user={currentUser}
                isSelf={true}
                audioEnabled={!isAudioMuted}
                videoEnabled={!isVideoOff}
                isScreenSharing={false}
                isHost={currentUser?.id === hostUserId || currentUser?._id === hostUserId}
              />
            </div>
          )}

          {/* Other remote participants in strip */}
          {otherRemotes.map((remote) => (
            <div key={remote.socketId} className="w-48 md:w-full h-32 md:h-44 shrink-0">
              <VideoTile
                stream={remote.stream}
                user={remote.user}
                isSelf={false}
                audioEnabled={remote.audioEnabled}
                videoEnabled={remote.videoEnabled}
                isScreenSharing={false}
                isHost={remote.user?.id === hostUserId || remote.user?._id === hostUserId}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard Grid layout when no screen is being shared
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
