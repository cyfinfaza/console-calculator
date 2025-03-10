<script>
  import { onMount } from "svelte";
  import {
    evaluateLines,
    setEvaluationMode,
    getEvaluationMode,
  } from "./lib/evaluator";
  import { downloadAsFile } from "./lib/helpers";

  let consoleView;
  let sizeTest;
  let results = [];
  let mode = "javascript"; // Default mode
  let isLoading = false;

  const resultClasses = {
    null: "normal",
    result: "normal",
    error: "error",
  };

  let dlStr = "";

  async function switchMode(newMode) {
    // if (newMode === mode) return;
    isLoading = true;
    mode = newMode;
    try {
      console.log("Switching to", newMode);
      await setEvaluationMode(newMode);
      await processConsole();
    } catch (error) {
      console.error("Error switching modes:", error);
      alert(
        "Failed to switch to Python mode. Please check console for details."
      );
      mode = "javascript";
      await setEvaluationMode("javascript");
    } finally {
      isLoading = false;
    }
  }

  async function processConsole() {
    localStorage.setItem("window_snapshot", consoleView.innerHTML);
    localStorage.setItem("mode", mode);
    let lines_unfiltered = consoleView.innerText.split("\n");
    let lines = [];
    let lastLine = "asdf";
    lines_unfiltered.forEach((line) => {
      if (!line && !lastLine) {
        lastLine = "asdf";
        return;
      } else {
        lastLine = line;
        lines.push(line);
      }
    });
    dlStr = lines.join("\n");
    let resultValues = await evaluateLines(lines);
    let ypos = 0;
    results = lines.map((line, ind) => {
      sizeTest.innerText = line + "-";
      let rect = sizeTest.getBoundingClientRect();
      let x = rect.width;
      let y = ypos;
      ypos += rect.height;
      return {
        line,
        x,
        y,
        content: resultValues[ind],
      };
    });
    // console.log(results);
    let setTitle = null;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].content.type === "result") {
        setTitle = results[i].content.value;
        break;
      }
    }
    document.title = setTitle || "console calculator";
  }

  onMount(async () => {
    console.log(
      "%ccc",
      "background-color: #8FF; color: black; padding: 8px; border-radius: 6px; font-family: monospace; font-weight: 900;"
    );
    let preload = localStorage.getItem("window_snapshot");
    if (preload) consoleView.innerHTML = preload;

    // Load previously saved mode
    let savedMode = localStorage.getItem("mode");
    if (savedMode && (savedMode === "javascript" || savedMode === "python")) {
      mode = savedMode;
      await switchMode(mode);
    }

    await processConsole();
    setTimeout(processConsole, 100);
  });
</script>

<main>
  <div class="topBar" style="--text: #8FF; --fg: #8FF2">
    cc
    <button
      on:click={async () => {
        consoleView.innerHTML = "";
        await processConsole();
      }}
      disabled={isLoading}>clear</button
    >
    <button
      on:click={() => {
        downloadAsFile(
          dlStr,
          "cc-" +
            new Date()
              .toLocaleString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              .replace(/,|\s|:/g, "-")
        );
      }}
      disabled={isLoading}>save</button
    >
    <button
      on:click={() => {
        print();
      }}
      disabled={isLoading}>print</button
    >
    <div class="modeSelector">
      <select
        bind:value={mode}
        on:change={() => switchMode(mode)}
        disabled={isLoading}
      >
        <option value="javascript">js</option>
        <option value="python">py</option>
      </select>
      {#if isLoading}
        <span class="loading">loading python...</span>
      {/if}
    </div>
  </div>
  <div class="consoleArea">
    <div class="sizeTest" bind:this={sizeTest}>hello</div>
    <div
      bind:this={consoleView}
      on:input={processConsole}
      on:paste={(event) => {
        event.preventDefault();

        const clipboardData = event.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData("text/plain");

        document.execCommand("insertText", false, pastedText);
      }}
      contenteditable
      spellcheck="false"
      class="consoleEditor"
      autofocus
      style="display: inline;"
    ></div>
    {#each results as result, ind}
      <div
        style:top={result.y + "px"}
        class={"resultBlock " + resultClasses[result.content.type]}
        style:left={result.x + "px"}
      >
        {result.content.type === "result" ? "= " : ""}
        {result.content.value}
      </div>
    {/each}
  </div>
</main>

<style lang="scss">
  main {
    padding: 16px;
    height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
    @media print {
      padding: 0;
    }
  }
  .topBar {
    display: flex;
    align-items: center;
    gap: 8px;
    @media print {
      display: none;
    }
  }
  .consoleArea {
    flex: 1;
    overflow: auto;
    position: relative;
    line-height: 1.5em;
  }
  .sizeTest {
    display: inline;
    position: absolute;
    visibility: hidden;
  }
  .resultBlock {
    position: absolute;
    white-space: nowrap;
    &.normal {
      color: var(--green);
    }
    &.error {
      color: var(--red);
    }
  }
  .consoleEditor {
    box-sizing: border-box;
    position: absolute;
    min-height: 100%;
    min-width: 100%;
    > :global(*::after) {
      content: attr(result-value);
      color: green;
    }
    &:focus {
      outline: none;
    }
  }
  .modeSelector {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .loading {
    font-size: 0.8em;
    color: var(--light);
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.5;
    }
  }
</style>
