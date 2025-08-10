// ================ DOM ELEMENTS ================
const themeToggle = document.querySelector(".theme-toggle");
const promptBtn = document.querySelector(".prompt-btn");
const generateBtn = document.querySelector(".generate-btn");
const promptInput = document.querySelector(".prompt-input");
const promptForm = document.querySelector(".prompt-form");
const modelSelect = document.getElementById("model-select");
const countSelect = document.getElementById("count-select");
const ratioSelect = document.getElementById("ratio-select");
const gridGallery = document.querySelector(".gallery-grid");
const keyModal = document.getElementById("key-modal");
const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");

// ================ CONFIGURATION ================
let API_KEY = localStorage.getItem("HF_API_KEY") || "";

// Model endpoints configuration
const MODEL_CONFIG = {
  "stabilityai/stable-diffusion-xl-base-1.0": {
    url: "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
    requiresModelParam: false,
    specialParams: {
      guidance_scale: 7.5,
      num_inference_steps: 50,
    },
  },
  "stabilityai/stable-diffusion-2-1": {
    url: "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1",
    requiresModelParam: false,
    specialParams: {
      guidance_scale: 7.5,
      num_inference_steps: 50,
    },
  },
  "prompthero/openjourney-v4": {
    url: "https://api-inference.huggingface.co/models/prompthero/openjourney-v4",
    requiresModelParam: false,
    specialParams: {
      guidance_scale: 7.5,
      num_inference_steps: 50,
    },
  },
};

// Example prompts
const EXAMPLE_PROMPTS = [
  "A magic forest with glowing plants and fairy homes among giant mushrooms",
  "An old steampunk airship floating through golden clouds at sunset",
  "A future Mars colony with glass domes and gardens against red mountains",
  "A dragon sleeping on gold coins in a crystal cave",
  "An underwater kingdom with merpeople and glowing coral buildings",
  "A cyberpunk city at night with neon lights and flying cars",
  "A peaceful Japanese garden with cherry blossoms in spring",
  "A medieval castle on a floating island in the sky",
  "A futuristic spaceship exploring a distant galaxy",
  "A cozy cabin in the woods during winter with smoke from the chimney",
];

// ================ INITIALIZATION ================
document.addEventListener("DOMContentLoaded", () => {
  // Check for API key on load
  if (!API_KEY) {
    showKeyModal();
  }

  // Initialize dark theme
  document.body.classList.add("dark-theme");
  themeToggle.querySelector("i").className = "fa-solid fa-sun";
});

// ================ KEY MANAGEMENT ================
function showKeyModal() {
  keyModal.style.display = "block";
}

function hideKeyModal() {
  keyModal.style.display = "none";
}

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key && key.startsWith("hf_")) {
    API_KEY = key;
    localStorage.setItem("HF_API_KEY", key);
    hideKeyModal();
    alert("API key saved successfully!");
  } else {
    alert("Please enter a valid Hugging Face API key (should start with hf_)");
  }
});

// ================ THEME TOGGLE ================
const toggleTheme = () => {
  const isDarkTheme = document.body.classList.toggle("dark-theme");
  themeToggle.querySelector("i").className = isDarkTheme
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";
};

// ================ IMAGE GENERATION ================
const getImageDimensions = (aspectRatio, baseSize = 512) => {
  const [width, height] = aspectRatio.split("/").map(Number);
  const scaleFactor = baseSize / Math.sqrt(width * height);

  let calculatedWidth = Math.round(width * scaleFactor);
  let calculatedHeight = Math.round(height * scaleFactor);

  // Ensure dimensions are multiples of 16
  calculatedWidth = Math.floor(calculatedWidth / 16) * 16;
  calculatedHeight = Math.floor(calculatedHeight / 16) * 16;

  return { width: calculatedWidth, height: calculatedHeight };
};

const updateImageCard = (imgIndex, imgUrl, error = null) => {
  const imgCard = document.getElementById(`img-card-${imgIndex}`);
  if (!imgCard) return;

  imgCard.classList.remove("loading");

  if (error) {
    imgCard.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>${error}</p>
            </div>
        `;
  } else {
    imgCard.innerHTML = `
            <img src="${imgUrl}" class="result-img" />
            <div class="img-overlay">
                <a href="${imgUrl}" class="img-download-btn" download="ai-image-${Date.now()}.png">
                    <i class="fa-solid fa-download"></i>
                </a>
            </div>
        `;
  }
};

const generateSingleImage = async (
  modelId,
  promptText,
  aspectRatio,
  imgIndex
) => {
  if (!API_KEY) {
    showKeyModal();
    throw new Error("API key required");
  }

  const modelConfig = MODEL_CONFIG[modelId];
  if (!modelConfig) throw new Error("Selected model is not available");

  const { width, height } = getImageDimensions(aspectRatio);

  try {
    const response = await fetch(modelConfig.url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: promptText,
        parameters: {
          width,
          height,
          ...modelConfig.specialParams,
        },
        options: {
          wait_for_model: true,
          use_cache: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // Handle invalid API key
      if (response.status === 401) {
        localStorage.removeItem("HF_API_KEY");
        API_KEY = "";
        showKeyModal();
        throw new Error("Invalid API key - please enter a valid key");
      }
      throw new Error(error.error || "Image generation failed");
    }

    return await response.blob();
  } catch (error) {
    console.error(`Error generating image ${imgIndex + 1}:`, error);
    throw error;
  }
};

const generateImages = async () => {
  if (!API_KEY) {
    showKeyModal();
    return;
  }

  const modelId = modelSelect.value;
  const promptText = promptInput.value.trim();
  const imageCount = parseInt(countSelect.value) || 1;
  const aspectRatio = ratioSelect.value || "1/1";

  if (!modelId) {
    alert("Please select a model");
    return;
  }

  if (!promptText) {
    alert("Please enter a prompt");
    return;
  }

  // Create loading cards
  gridGallery.innerHTML = "";
  for (let i = 0; i < imageCount; i++) {
    gridGallery.innerHTML += `
            <div class="img-card loading" id="img-card-${i}" style="aspect-ratio:${aspectRatio}">
                <div class="status-container">
                    <div class="spinner"></div>
                    <p class="status-text">Generating...</p>
                </div>
            </div>
        `;
  }

  // Disable generate button during processing
  generateBtn.disabled = true;
  generateBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

  try {
    const generationPromises = Array.from(
      { length: imageCount },
      async (_, i) => {
        try {
          const blob = await generateSingleImage(
            modelId,
            promptText,
            aspectRatio,
            i
          );
          updateImageCard(i, URL.createObjectURL(blob));
        } catch (error) {
          console.error(`Error generating image ${i + 1}:`, error);
          updateImageCard(i, null, error.message);
        }
      }
    );

    await Promise.all(generationPromises);
  } catch (error) {
    console.error("Generation error:", error);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML =
      '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate';
  }
};

// ================ EVENT LISTENERS ================
promptBtn.addEventListener("click", () => {
  const randomPrompt =
    EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
  promptInput.value = randomPrompt;
  promptInput.focus();
});

promptForm.addEventListener("submit", (e) => {
  e.preventDefault();
  generateImages();
});

themeToggle.addEventListener("click", toggleTheme);
