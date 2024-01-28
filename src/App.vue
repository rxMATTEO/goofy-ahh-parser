<script setup lang="ts">
import {provide} from "vue";

provide('apiUrl', import.meta.env.PROD ? 'http://localhost:3001/api' : 'http://localhost:3001/api');
</script>

<template>
  <RouterView />
</template>