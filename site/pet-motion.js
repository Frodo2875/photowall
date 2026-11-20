function frame(offset, lift, tilt = 0, width = 1, height = width, easing = 'ease-in-out') {
  return {
    offset,
    transform: `translateY(${lift}%) rotate(${tilt}deg) scale(${width}, ${height})`,
    easing,
  };
}

const jump = [
  frame(.15, 0, 0, 1.04, .95, 'ease-out'),
  frame(.46, -12, -1.5, .985, 1.025, 'ease-in'),
  frame(.71, 0, 0, 1.045, .948, 'ease-out'),
  frame(.86, -1.2, .4, .996, 1.014),
];

// Key poses define the motion arcs. The browser interpolates on its own timeline.
export const petMotion = {
  wave: {
    duration: 1320,
    frames: [frame(.19, -1, -3.6), frame(.38, -.5, 2.3), frame(.56, -1, -2.4), frame(.74, 0, 1.4)],
  },
  cheer: { duration: 980, frames: jump },
  trophy: { duration: 1200, frames: jump },
  heart: {
    duration: 1250,
    frames: [frame(.2, 0, -1, .985), frame(.43, -1.8, 1, 1.035), frame(.73, -.45, -.6, 1.007)],
  },
  think: {
    duration: 1550,
    frames: [frame(.3, 0, -3.9), frame(.57, 0, -3.3), frame(.78, 0, .55)],
  },
  detective: {
    duration: 1480,
    frames: [frame(.16, 7, 0, 1, .97, 'ease-out'), frame(.44, -2.4, -1.3), frame(.67, .4, .55)],
  },
  doze: {
    duration: 2940,
    frames: [frame(.16, 2, 0, 1.018, .976), frame(.43, 0, 0, 1.008, 1.02),
      frame(.67, 1, 0, 1.018, .989), frame(.83, -1.4, -1.2, .996, 1.015)],
  },
};

export const settledFrame = frame(1, 0);
