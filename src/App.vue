<script setup lang="ts">
import axios from "axios";
import {onMounted, ref} from "vue";

let result = ref(null);
onMounted(async () => {
  result.value = await axios.get('http://localhost:3000/');
})
</script>

<template>
  <div v-html="result?.data">
  </div>
</template>

<style scoped>
</style>
