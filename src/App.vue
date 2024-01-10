<script setup lang="ts">
import {provide} from "vue";

provide('apiUrl', 'http://localhost:3001');
</script>

<template>
  <RouterView />
</template>