<script setup lang="ts">
import {provide} from "vue";

provide('apiUrl', import.meta.env.PROD ? 'https://pass.ri-advance.ru/api' : 'http://localhost:3001/api');
</script>

<template>
  <RouterView />
</template>