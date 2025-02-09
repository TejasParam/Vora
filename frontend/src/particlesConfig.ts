export const particlesConfig = {
  particles: {
    number: {
      value: 100,
      density: {
        enable: true,
        value_area: 800
      }
    },
    color: {
      value: ["#166534", "#15803d", "#166534"]
    },
    shape: {
      type: "circle"
    },
    opacity: {
      value: 0.6,
      random: false,
      anim: {
        enable: false,
        speed: 1,
        opacity_min: 0.4,
        sync: false
      }
    },
    size: {
      value: 4,
      random: true,
      anim: {
        enable: false,
        speed: 40,
        size_min: 2,
        sync: false
      }
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#166534",
      opacity: 0.4,
      width: 1.5
    },
    move: {
      enable: true,
      speed: 3,
      direction: "none",
      random: false,
      straight: false,
      out_mode: "bounce",
      bounce: false,
      attract: {
        enable: false,
        rotateX: 600,
        rotateY: 1200
      }
    }
  },
  interactivity: {
    detect_on: "window",
    events: {
      onhover: {
        enable: true,
        mode: "repulse"
      },
      onclick: {
        enable: true,
        mode: "push"
      },
      resize: true
    },
    modes: {
      repulse: {
        distance: 200,
        duration: 0.4,
        speed: 1,
        factor: 100
      },
      push: {
        particles_nb: 4
      }
    }
  },
  retina_detect: true
} 