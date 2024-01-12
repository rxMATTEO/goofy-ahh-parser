<script setup lang="ts">
import {provide} from "vue";

provide('apiUrl', import.meta.env.PROD ? 'https://rtf-parser.vercel.app:3001' : 'http://localhost:3001');
</script>

<template>
  <RouterView />
</template>