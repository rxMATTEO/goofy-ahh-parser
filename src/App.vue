<script setup lang="ts">
import axios from "axios";
import {onMounted, ref} from "vue";

const body = ref(null);
const info = ref(null);
const people = ref(null);
onMounted(async () => {
  body.value = (await axios.get('http://localhost:3000/')).data;
  info.value = (await axios.get('http://localhost:3000/info')).data;
  people.value = (await axios.get('http://localhost:3000/people')).data;
  console.log(people.value)
})
</script>

<template>
  <div class="p-10">
    <div v-if="info" class="flex place-content-between">
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
      {{
      people
      }}
      <!--  <DataTable :value="headers?.data">-->
      <!--    <Column v-for="header in headers?.data" :header="header" />-->
      <!--  </DataTable>-->
    </div>
  </div>
</template>

<style scoped>
</style>
