<script>
  let consoleView;

  function processConsole() {
    consoleView.innerHTML;
  }
</script>

<main>
  <div class="topBar" style="--text: #8FF; --fg: #8FF2">
    qcalc
    <button>menu</button>
  </div>
  <div
    bind:this={consoleView}
    on:change={processConsole}
    contenteditable
    spellcheck="false"
    class="consoleView"
    autofocus
    style="display: inline;"
  ></div>
</main>

<style lang="scss">
  main {
    padding: 16px;
    height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .topBar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .consoleView {
    line-height: 1.5em;
    flex: 1;
    overflow: auto;
    > :global(*::after) {
      content: attr(result-value);
      color: green;
    }
    &:focus {
      outline: none;
    }
  }
</style>
