<script>
  export let value
  export let options = {}
  export let only7Bit = false
  export let numeric = true
  export let withEmpty = true

  $: augmentedOptions = {
    ...withEmpty ? { [numeric ? 0 : '']: '' } : {},
    ...options
  }
</script>

<select bind:value>
  {#each Object.entries(augmentedOptions) as [key, value]}
    <option value={numeric ? Number(key) : key} disabled={only7Bit && Number(key) >= 0x80}>{value}</option>
  {/each}
  {#if !(value in augmentedOptions)}
    <option {value}>{numeric ? `0x${Number(value).toString(16)}` : value}</option>
  {/if}
</select>
