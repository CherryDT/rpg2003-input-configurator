<script>
  import { parseData, patchData } from './dataHandler.js'
  import { windowsKeyCodes, rmVirtualButtons } from './constants.js'
  import Select from './Select.svelte'

  let dataView = null
  let data = null

  function loadFile (event) {
    const file = event.target.files[0]
    if (!file) {
      dataView = null
      data = null
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', e2 => {
      try {
        dataView = new DataView(e2.target.result)
        data = parseData(dataView)
      } catch (e) {
        console.error(e)
        alert('Failed to parse file! ' + e)
      }
    })
    reader.readAsArrayBuffer(file)
  }

  function downloadResult () {
    if (!dataView) {
      return
    }

    try {
      patchData(dataView, data)
    } catch (e) {
      console.error(e)
      alert('Failed to patch data! ' + e)
      return
    }

    const blob = new Blob([dataView.buffer], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'RPG_RT_mod.exe'
    a.click()
    URL.revokeObjectURL(url)
  }
</script>

<style>
  :global(body) {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 10px;
  }

  :global(*) {
    box-sizing: border-box;
  }

  dl {
    display: grid;
    grid-template-columns: max-content auto;
  }

  .joypad-button {
    display: inline-block;
    width: 16px;
  }

  .dpad {
    display: grid;
    gap: 10px;
    grid-template-columns: max-content max-content max-content;
    grid-template-areas:
      '. up .'
      'left . right'
      '. down .';
  }

  .dpad > div {
    grid-area: var(--area);
  }

  main {
    display: flex;
    flex-wrap: wrap;
    gap: 50px;
  }
</style>

<a style="display: block; float: right;" href="https://github.com/CherryDT/rpg2003-input-configurator">GitHub</a>

<h1 style="margin-bottom: 0;">RM2k3 Input Configurator</h1>
<h6 style="margin-top: 0;">By <a href="https://cherrytree.at/about">Cherry</a></h6>

<div>
  Please load the RPG_RT.exe of your game. It must be v1.08 or higher (including official versions 1.10+). Maniac patch is supported only before version 210519.
  <br />
  <input type="file" on:change={loadFile} accept=".exe" />
  {#if dataView}
    <br />
    <button on:click={downloadResult}>Download patched file</button> (remember to create backup before you actually replace the file in your project!)
  {/if}
</div>

{#if data}
  {#if data.supported}
    <main>
      <section>
        <h2>1. Regular Key Assignments (by virtual button)</h2>
        <dl>
          {#each Object.entries(data.keyAssignments) as [button, assignments]}
            <dt>{rmVirtualButtons[button] ?? `0x${Number(button).toString(16)}`}</dt>
            <dd>
              &larr;
              {#each assignments as assignment}
                <Select bind:value={assignment.value} options={windowsKeyCodes} />
              {/each}
            </dd>
          {/each}
        </dl>
      </section>

      <section>
        <h2>2. Extra Key Assignments (by key)</h2>
        <ol>
          {#each data.freestyleAssignments as assignment}
            <li>
              <Select bind:value={assignment.keyCode} options={windowsKeyCodes} />
              &rarr;
              <Select bind:value={assignment.value} options={rmVirtualButtons} />
            </li>
          {/each}
        </ol>
      </section>

      <section>
        <h2>3. Gamepad Assignments</h2>

        <main>
          <section>
            <h3>Left Stick</h3>
            <div class="dpad">
              <div style:--area="up"><Select bind:value={data.joypad.up.value} options={rmVirtualButtons} /></div>
              <div style:--area="left"><Select bind:value={data.joypad.left.value} options={rmVirtualButtons} /></div>
              <div style:--area="right"><Select bind:value={data.joypad.right.value} options={rmVirtualButtons} /></div>
              <div style:--area="down"><Select bind:value={data.joypad.down.value} options={rmVirtualButtons} /></div>
            </div>
          </section>

          <section>
            {#if data.joypadPov}
              <h3>D-Pad</h3>
              <div class="dpad">
                <div style:--area="up"><Select bind:value={data.joypadPov.up} options={rmVirtualButtons} /></div>
                <div style:--area="left"><Select bind:value={data.joypadPov.left} options={rmVirtualButtons} /></div>
                <div style:--area="right"><Select bind:value={data.joypadPov.right} options={rmVirtualButtons} /></div>
                <div style:--area="down"><Select bind:value={data.joypadPov.down} options={rmVirtualButtons} /></div>
              </div>
            {/if}
          </section>

          <section>
            <h3>Buttons</h3>
            <ol>
              <li><span class="joypad-button">A</span> &rarr; <Select bind:value={data.joypad.button1.value} options={rmVirtualButtons} /></li>
              <li><span class="joypad-button">B</span> &rarr; <Select bind:value={data.joypad.button2.value} options={rmVirtualButtons} /></li>
              <li><span class="joypad-button">X</span> &rarr; <Select bind:value={data.joypad.button3.value} options={rmVirtualButtons} /></li>
              <li><span class="joypad-button">Y</span> &rarr; <Select bind:value={data.joypad.button4.value} options={rmVirtualButtons} /></li>
              <li><span class="joypad-button">L</span> &rarr; <Select bind:value={data.joypad.button5.value} options={rmVirtualButtons} /></li>
              <li><span class="joypad-button">R</span> &rarr; <Select bind:value={data.joypad.button6.value} options={rmVirtualButtons} /></li>
            </ol>
          </section>
        </main>
      </section>
    </main>
  {:else}
    <strong style="color: red;">The file that you loaded is not a supported RPG_RT.exe version.</strong>
  {/if}

  <pre style="display: none;">{JSON.stringify(data, null, 2)}</pre>
{/if}
