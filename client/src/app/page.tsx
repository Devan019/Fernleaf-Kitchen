"use client";

import { apiFetch } from "@/lib/api";
import { useEffect } from "react";

export default function UsersPage() {
  useEffect(() => {
    async function getUsers() {
    const data = await apiFetch("/");
      console.log(data);
    }

    getUsers();
  }, []);

  return <h1>Users</h1>;
}