<script setup lang="ts">
import axios from "axios";
import {onMounted, ref} from "vue";

const body = ref(null);
const info = ref(null);
onMounted(async () => {
  body.value = (await axios.get('http://localhost:3000/')).data;
  info.value = (await axios.get('http://localhost:3000/info')).data;
})
</script>

<template>
  <div v-if="info">
    <div>
      Тип событий: {{ info.eventsType }}
    </div>
    <div>
      {{ info.creationDate }}
    </div>
    <div>
      Дата: {{ info.dates }}
    </div>
    <div>
      Время: {{ info.time }}
    </div>
<!--  <DataTable :value="headers?.data">-->
<!--    <Column v-for="header in headers?.data" :header="header" />-->
<!--  </DataTable>-->
  </div>
</template>

<style scoped>
</style>
