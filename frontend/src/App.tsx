import { useState } from "react";
import "./App.css";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";


function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <div className="flex min-h-svh flex-col items-center justify-center">
        <Card>Test TestTestTest Test Test Test Test Test Test Test Test Test 
        <Button variant="default">Click me</Button>

        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        </Card>
     
      </div>
    </>
  );  
}

export default App;
