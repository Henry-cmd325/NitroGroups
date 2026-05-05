using System;
using AutoMapper;
public class User { public long Id { get; set;} }
public class UserDto { public int Id { get; set;} }
class Program { 
    static void Main() { 
        var config = new MapperConfiguration(cfg => cfg.CreateMap<User, UserDto>()); 
        var mapper = config.CreateMapper(); 
        var u = new User { Id = 5 }; 
        var dto = mapper.Map<UserDto>(u); 
        Console.WriteLine("mapped " + dto.Id); 
    } 
}
